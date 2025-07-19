import csv
import requests
import os
import re
from urllib.parse import urlparse, parse_qs
import time

def extract_file_id_from_drive_url(url):
    """
    Extract file ID from Google Drive URL
    Supports different Google Drive URL formats
    """
    # Handle different Google Drive URL formats
    if '/file/d/' in url:
        # Format: https://drive.google.com/file/d/FILE_ID/view
        match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
        if match:
            return match.group(1)
    elif 'id=' in url:
        # Format: https://drive.google.com/open?id=FILE_ID
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        if 'id' in query_params:
            return query_params['id'][0]
    
    return None

def download_file_from_drive(file_id, filename, output_dir):
    """
    Download file from Google Drive using file ID
    """
    # Google Drive direct download URL
    download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    
    try:
        # First request to get the confirmation token
        response = requests.get(download_url, stream=True)
        
        # Check if we need to handle large files (Google Drive confirmation page)
        if 'confirm=' in response.url:
            # Extract confirmation token
            confirm_token = re.search(r'confirm=([^&]+)', response.url).group(1)
            download_url = f"https://drive.google.com/uc?export=download&id={file_id}&confirm={confirm_token}"
            response = requests.get(download_url, stream=True)
        
        # Check if download was successful
        if response.status_code == 200:
            file_path = os.path.join(output_dir, filename)
            
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            print(f"✅ Successfully downloaded: {filename}")
            return True
        else:
            print(f"❌ Failed to download {filename}: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error downloading {filename}: {str(e)}")
        return False

def sanitize_filename(name):
    """
    Sanitize filename to be safe for file system
    """
    # Remove or replace invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, '_')
    
    # Remove extra spaces and limit length
    name = ' '.join(name.split())
    if len(name) > 100:
        name = name[:100]
    
    return name

def download_json_files_from_csv(csv_file_path, output_dir="json_files"):
    """
    Download JSON files from Google Drive links in CSV file
    """
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"📁 Created directory: {output_dir}")
    
    successful_downloads = 0
    failed_downloads = 0
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row_num, row in enumerate(reader, start=2):  # Start from 2 to account for header
                name = row.get('name', f'workflow_{row_num}')
                template_url = row.get('template_url', '').strip()
                
                if not template_url:
                    print(f"⚠️  No template URL found for row {row_num}: {name}")
                    continue
                
                # Extract file ID from Google Drive URL
                file_id = extract_file_id_from_drive_url(template_url)
                
                if not file_id:
                    print(f"❌ Could not extract file ID from URL: {template_url}")
                    failed_downloads += 1
                    continue
                
                # Sanitize filename and add .json extension
                safe_name = sanitize_filename(name)
                filename = f"{safe_name}.json"
                
                # Check if file already exists
                file_path = os.path.join(output_dir, filename)
                if os.path.exists(file_path):
                    print(f"⏭️  File already exists, skipping: {filename}")
                    continue
                
                # Download the file
                print(f"📥 Downloading: {name}")
                if download_file_from_drive(file_id, filename, output_dir):
                    successful_downloads += 1
                else:
                    failed_downloads += 1
                
                # Add a small delay to be respectful to Google's servers
                time.sleep(1)
    
    except FileNotFoundError:
        print(f"❌ CSV file not found: {csv_file_path}")
        return
    except Exception as e:
        print(f"❌ Error reading CSV file: {str(e)}")
        return
    
    print(f"\n📊 Download Summary:")
    print(f"✅ Successful downloads: {successful_downloads}")
    print(f"❌ Failed downloads: {failed_downloads}")
    print(f"📁 Files saved to: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    # Download JSON files from the CSV
    csv_file = "n8n Templates - Templates.csv"
    download_json_files_from_csv(csv_file) 