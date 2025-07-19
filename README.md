# N8N JSON File Downloader

This tool downloads JSON files from Google Drive links found in a CSV file. It supports both Python and JavaScript implementations.

## Features

- Downloads JSON files from Google Drive links in CSV format
- Handles different Google Drive URL formats
- Sanitizes filenames for safe file system storage
- Skips already downloaded files
- Provides detailed progress and error reporting
- Respects Google's servers with rate limiting

## File Structure

```
n8n_workflows/
├── n8n Templates - Templates.csv    # Your CSV file with template URLs
├── json_files/                      # Output directory for downloaded JSON files
├── download_json_files.py           # Python version
├── download_json_files.js           # JavaScript version
├── package.json                     # Node.js dependencies
├── requirements.txt                 # Python dependencies
└── README.md                        # This file
```

## Prerequisites

### For Python Version

- Python 3.6 or higher
- `requests` library

### For JavaScript Version

- Node.js 14 or higher
- `csv-parse` library

## Installation

### Python Version

```bash
pip install -r requirements.txt
```

### JavaScript Version

```bash
npm install
```

## Usage

### Python Version

```bash
python download_json_files.py
```

### JavaScript Version

```bash
npm start
# or
node download_json_files.js
```

## CSV File Format

The CSV file should have the following columns:

- `name`: The name of the workflow (used for filename)
- `template_url`: Google Drive URL to the JSON file

Example:

```csv
name,template_url
RAG Agents Workflow,https://drive.google.com/file/d/1ee6skeDuBnYYV_9thU9bCnwYgc1sM-Ii/view?usp=drive_link
PPC Thievery,https://drive.google.com/file/d/1ka5OJF-1NWZdM0aM0VA8lZ9AJYvh2cnP/view?usp=drive_link
```

## Supported Google Drive URL Formats

The tool supports these Google Drive URL formats:

- `https://drive.google.com/file/d/FILE_ID/view`
- `https://drive.google.com/open?id=FILE_ID`
- `https://drive.google.com/uc?id=FILE_ID`

## Output

- JSON files are saved to the `json_files/` directory
- Filenames are sanitized and based on the `name` column from the CSV
- Progress is displayed in the console with emojis for easy reading
- A summary is shown at the end with success/failure counts

## Error Handling

- Invalid URLs are reported and skipped
- Network errors are handled gracefully
- Files that already exist are skipped
- Large files that require Google Drive confirmation are handled automatically

## Rate Limiting

The tool includes a 1-second delay between downloads to be respectful to Google's servers and avoid rate limiting.

## Customization

You can modify the scripts to:

- Change the output directory
- Adjust the delay between downloads
- Add custom filename patterns
- Implement additional error handling

## Troubleshooting

### Common Issues

1. **CSV file not found**: Make sure the CSV file is in the same directory as the script
2. **Permission errors**: Ensure you have write permissions in the output directory
3. **Network timeouts**: The script includes 30-second timeouts for downloads
4. **Invalid URLs**: Check that the Google Drive URLs in your CSV are accessible

### Debug Mode

For more detailed error information, you can modify the scripts to include additional logging.

## License

MIT License - feel free to use and modify as needed.
