const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { parse } = require("csv-parse/sync");

/**
 * Extract file ID from Google Drive URL
 * Supports different Google Drive URL formats
 */
function extractFileIdFromDriveUrl(url) {
  // Handle different Google Drive URL formats
  if (url.includes("/file/d/")) {
    // Format: https://drive.google.com/file/d/FILE_ID/view
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return match[1];
    }
  } else if (url.includes("id=")) {
    // Format: https://drive.google.com/open?id=FILE_ID
    const urlObj = new URL(url);
    return urlObj.searchParams.get("id");
  }

  return null;
}

/**
 * Download file from Google Drive using file ID
 */
function downloadFileFromDrive(fileId, filename, outputDir) {
  return new Promise((resolve, reject) => {
    // Google Drive direct download URL
    let downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    function makeRequest(url, isRetry = false) {
      const protocol = url.startsWith("https:") ? https : http;

      const request = protocol.get(url, (response) => {
        // Check if we need to handle large files (Google Drive confirmation page)
        if (
          response.headers.location &&
          response.headers.location.includes("confirm=")
        ) {
          // Extract confirmation token and retry
          const confirmMatch =
            response.headers.location.match(/confirm=([^&]+)/);
          if (confirmMatch) {
            const confirmToken = confirmMatch[1];
            const newUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
            makeRequest(newUrl, true);
            return;
          }
        }

        // Check if download was successful
        if (response.statusCode === 200) {
          const filePath = path.join(outputDir, filename);
          const fileStream = fs.createWriteStream(filePath);

          response.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close();
            console.log(`✅ Successfully downloaded: ${filename}`);
            resolve(true);
          });

          fileStream.on("error", (err) => {
            console.log(`❌ Error writing file ${filename}: ${err.message}`);
            reject(err);
          });
        } else {
          console.log(
            `❌ Failed to download ${filename}: HTTP ${response.statusCode}`
          );
          reject(new Error(`HTTP ${response.statusCode}`));
        }
      });

      request.on("error", (err) => {
        console.log(`❌ Error downloading ${filename}: ${err.message}`);
        reject(err);
      });

      // Set timeout
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error("Request timeout"));
      });
    }

    makeRequest(downloadUrl);
  });
}

/**
 * Sanitize filename to be safe for file system
 */
function sanitizeFilename(name) {
  // Remove or replace invalid characters
  const invalidChars = /[<>:"/\\|?*]/g;
  let safeName = name.replace(invalidChars, "_");

  // Remove extra spaces and limit length
  safeName = safeName.replace(/\s+/g, " ").trim();
  if (safeName.length > 100) {
    safeName = safeName.substring(0, 100);
  }

  return safeName;
}

/**
 * Download JSON files from Google Drive links in CSV file
 */
async function downloadJsonFilesFromCsv(csvFilePath, outputDir = "json_files") {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${outputDir}`);
  }

  let successfulDownloads = 0;
  let failedDownloads = 0;

  try {
    // Read and parse CSV file
    const csvContent = fs.readFileSync(csvFilePath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    for (let rowNum = 0; rowNum < records.length; rowNum++) {
      const row = records[rowNum];
      const name = row.name || `workflow_${rowNum + 2}`;
      const templateUrl = (row.template_url || "").trim();

      if (!templateUrl) {
        console.log(`⚠️  No template URL found for row ${rowNum + 2}: ${name}`);
        continue;
      }

      // Extract file ID from Google Drive URL
      const fileId = extractFileIdFromDriveUrl(templateUrl);

      if (!fileId) {
        console.log(`❌ Could not extract file ID from URL: ${templateUrl}`);
        failedDownloads++;
        continue;
      }

      // Sanitize filename and add .json extension
      const safeName = sanitizeFilename(name);
      const filename = `${safeName}.json`;

      // Check if file already exists
      const filePath = path.join(outputDir, filename);
      if (fs.existsSync(filePath)) {
        console.log(`⏭️  File already exists, skipping: ${filename}`);
        continue;
      }

      // Download the file
      console.log(`📥 Downloading: ${name}`);
      try {
        await downloadFileFromDrive(fileId, filename, outputDir);
        successfulDownloads++;
      } catch (error) {
        console.log(`❌ Failed to download ${filename}: ${error.message}`);
        failedDownloads++;
      }

      // Add a small delay to be respectful to Google's servers
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`❌ CSV file not found: ${csvFilePath}`);
      return;
    }
    console.log(`❌ Error reading CSV file: ${error.message}`);
    return;
  }

  console.log(`\n📊 Download Summary:`);
  console.log(`✅ Successful downloads: ${successfulDownloads}`);
  console.log(`❌ Failed downloads: ${failedDownloads}`);
  console.log(`📁 Files saved to: ${path.resolve(outputDir)}`);
}

// Main execution
async function main() {
  const csvFile = "n8n Templates - Templates.csv";
  await downloadJsonFilesFromCsv(csvFile);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  downloadJsonFilesFromCsv,
  extractFileIdFromDriveUrl,
  downloadFileFromDrive,
  sanitizeFilename,
};
