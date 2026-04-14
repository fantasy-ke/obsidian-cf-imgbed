# CF ImageBed for Obsidian

<div align="center">

[English](README_EN.md) | [中文](README.md)

</div>

> Note: In Obsidian, this language switch link opens in your browser.

An Obsidian plugin for uploading images to CloudFlare ImgBed with local image upload, remote image fetching, and batch replacement for images in the current note.

## Features

- **Multiple Upload Methods**: Support drag & drop, paste, right-click selection, and command-based batch upload
- **Remote Image Capture**: Fetch remote images and upload them into your own image bed
- **Batch Replacement**: Upload all images in the current note and replace links automatically
- **Flexible Configuration**: Multiple upload channels and naming options
- **Exclusion List**: Skip remote images from configured domains; the current image bed domain is excluded by default
- **Quick Integration**: Automatically insert Markdown image links after upload
- **Cross-Platform**: Support desktop and mobile devices
- **Smart Handling**: Prevents duplicate content from Obsidian's default image handling
- **Mobile Optimization**: Support camera capture and gallery selection with modern UI design

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` files
2. Copy files to your Obsidian vault's `.obsidian/plugins/cf-imageBed/` directory
3. Restart Obsidian and enable the plugin

### Development Installation

1. Clone this repository
2. Ensure Node.js version is at least v16
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start development mode compilation
5. Run `npm run build` to build production version

## Usage

### 1. Plugin Configuration

1. Open Obsidian Settings
2. Go to **Community plugins** page
3. Find **CF ImageBed** plugin and enable it
4. Click the gear icon next to the plugin to enter settings
5. Configure the following required parameters:
   - **API URL**: Your CloudFlare ImgBed service address (e.g., `https://your.domain`)
   - **Auth code** or **API token**: Either one is required; when API token is provided, Bearer token authentication is used with priority

### 2. Optional Configuration

- **Upload Channel**: Choose `telegram`, `cfr2`, `s3`, `discord`, or `huggingface`
- **Channel Name**: Specify a concrete channel instance in multi-channel deployments
- **Chunk Size**: Always shown. Telegram defaults to 16MB, Discord to 8MB, and other channels default to 0. `0` disables chunked upload
- **File Naming**: Select file naming rules. In `custom` mode, the file is renamed with placeholders first, then uploaded using the original-name mode
- **Return Format**: Choose return link format
- **Upload Folder**: Specify upload directory (optional). Placeholders are supported
- **Server Compression**: Always shown, only editable for the Telegram channel, and disabled by default
- **Auto Retry**: Automatically switch channels on failure

### 2.2 Advanced options

- **Enable Remote Image Upload**: When enabled, pasted markdown image links, HTML `<img>` tags, and plain image URLs will be fetched and uploaded to your own image bed
- **Excluded Remote Domains**: Supports commas or new lines. Remote images from these domains are skipped to avoid duplicate uploads
- **Auto-exclude Current Image Bed Domain**: The hostname from `API URL` is always excluded automatically
- **Backup Path**: When local backup is enabled, the backup path also supports placeholders

### 2.3 Placeholder reference

The following settings support placeholders:

- **Custom file name template**
- **Upload folder**
- **Backup path**

#### Meaning of each placeholder

| Placeholder | Meaning | Example result |
| --- | --- | --- |
| `${noteFileName}` | Current note file name without the `.md` extension | `weekly-report` |
| `${noteFolderName}` | Name of the folder containing the current note | `Projects` |
| `${noteFolderPath}` | Full folder path of the current note | `Notes/Projects` |
| `${noteFilePath}` | Full path of the current note | `Notes/Projects/weekly-report.md` |
| `${originalAttachmentFileName}` | Original attachment file name without extension | `image` |
| `${originalAttachmentFileExtension}` | Original attachment file extension without the dot | `png` |
| `${date}` | Current date, default format `YYYYMMDD` | `20260327` |
| `${time}` | Current time, default format `HHmmss` | `153045` |
| `${datetime}` | Current date and time, default format `YYYYMMDD-HHmmss` | `20260327-153045` |
| `${timestamp}` | Current timestamp in milliseconds | `1774596645123` |
| `${uuid}` | Random UUID | `550e8400-e29b-41d4-a716-446655440000` |

#### Notes

- String placeholders such as `${noteFileName}`, `${noteFolderName}`, and `${originalAttachmentFileName}` support simple formatting, for example `${noteFileName:{case:'lower'}}` and `${originalAttachmentFileName:{slugify:true}}`
- `${date}`, `${time}`, and `${datetime}` support `momentJsFormat`, for example `${date:{momentJsFormat:'YYYY-MM-DD'}}`
- Multiple placeholders can be combined, for example `${noteFileName}-${datetime}-${originalAttachmentFileName}`
- In `custom` naming mode, the actual behavior is: rename the file from the template first, then upload it using the original-name mode

#### Common template examples

- **Custom file name template**: `${noteFileName}-${datetime}-${originalAttachmentFileName}`
- **Upload folder**: `${noteFolderName}/${date}`
- **Backup path**: `backup/${noteFolderName}/${noteFileName}`

### 2.1 Upload channel overview

| Channel | Advantages | Limitations |
| --- | --- | --- |
| Telegram Bot | Completely free, effectively unlimited capacity | Files larger than 20MB require chunk storage |
| Cloudflare R2 | No file size limit, enterprise-grade performance | Billing is required after the 10GB free tier |
| S3 compatible storage | Flexible vendors and pricing | Pricing depends on the provider |
| Discord | Completely free and easy to use | Files larger than 10MB require chunk storage |
| HuggingFace | Completely free and supports large direct uploads | Requires a HuggingFace account |

### 3. Upload Images

The plugin supports five common workflows:

#### Method 1: Drag & Drop
1. Drag image files directly to Obsidian editor
2. Plugin will automatically upload and insert Markdown links

#### Method 2: Paste Upload
1. Copy image to clipboard
2. Press `Ctrl+V` (Windows/Linux) or `Cmd+V` (Mac) in Obsidian editor
3. Plugin will automatically upload and insert Markdown links

#### Method 3: Paste remote image links
1. Enable **Enable Remote Image Upload** in advanced settings
2. Copy a markdown image link, an HTML `<img>` tag, or a direct image URL
3. Paste it into the editor
4. The plugin will fetch the remote image, upload it to your own image bed, and replace the link on success
5. Failed uploads keep the original content unchanged

#### Method 4: Right-click Upload
1. Right-click in editor and select "Upload image to CF ImageBed"
2. Choose the image file to upload

#### Method 5: Batch upload all images in the current note
1. Open the command palette
2. Run **Upload current note images to CF ImageBed**
3. The plugin scans Markdown and Wiki image references in the active note and uploads them in batch
4. If **Enable Remote Image Upload** is enabled, remote images in the note are processed too
5. Remote images from excluded domains are skipped, and failed uploads keep the original links

### 4. Mobile Usage

#### Android/iOS Devices
1. Add `upload-image-mobile` **"📷 Camera or Gallery Selection"** command to mobile toolbar in Obsidian settings
2. Tap the toolbar button and choose image source:
   - **📷 Camera**: Take photo directly with camera
   - **🖼️ Gallery**: Select image from phone gallery
3. Image will be automatically uploaded and inserted into editor

#### Mobile Features
- **Smart Device Detection**: Automatically detects mobile devices and optimizes experience
- **Modern UI**: Beautiful selection dialog with hover animations
- **Camera Integration**: Support direct camera capture
- **Gallery Selection**: Quick selection from phone gallery

## API Configuration

This plugin uses CloudFlare ImgBed's upload API with the following parameters:

- **Endpoint**: `/upload`
- **Method**: `POST`
- **Authentication**: Upload auth code, or API token with `upload` permission via Bearer token
- **Content Type**: `multipart/form-data`

### Chunked upload behavior

- Telegram: default chunk size is **16MB**
- Discord: default chunk size is **8MB**
- Other channels: default chunk size is **0**, which disables chunked upload
- HuggingFace: usually supports large direct uploads without client-side chunking
- Cloudflare R2 / S3: usually do not require client-side chunking

The plugin automatically decides whether chunked upload is needed according to the selected channel and file size.

For detailed API documentation, please refer to CloudFlare ImgBed official [documentation](https://cfbed.sanyue.de/api/upload.html).

## Troubleshooting

### Common Issues

1. **Upload Failed**
   - Check if API URL and auth code are correctly configured
   - Verify network connection
   - Check if CloudFlare ImgBed service is running normally

2. **Images Not Displaying**
   - Confirm return link format is correct
   - Check domain configuration

3. **Drag & Drop Not Working**
   - Ensure plugin is properly enabled
   - Restart Obsidian and try again

## Version History

<details>
<summary><strong>v1.0.7 (Latest)</strong></summary>

### Features & Improvements
- feat: Improve Obsidian review compliance and multilingual UX

#### Detailed Changes
- Added an English intro at the top of README and clarified that language-switch links open in browser inside Obsidian
- Updated plugin naming to `CF ImageBed for Obsidian`
- Default language now prefers Obsidian `getLanguage()`
- Localized upload and settings-validation notices with i18n (zh/en)
- Switched upload/image-processing debug logs to development builds only
- Updated `manifest.json` minimum app version to `1.8.7`, and removed unnecessary `authorUrl` / `fundingUrl`

</details>

<details>
<summary><strong>v1.0.6</strong></summary>

### Features & Improvements
- feat: Add remote image upload, excluded domain list, and current-note batch upload command

#### Detailed Changes
- Added an advanced setting to control whether remote images should be re-uploaded
- Added an excluded-domain list, with the current API hostname excluded automatically
- Support pasted markdown image links, HTML image tags, and plain image URLs
- Added a command to batch upload images from the current note and replace links automatically
- Failed remote or batch uploads keep the original links unchanged

</details>

<details>
<summary><strong>v1.0.3</strong></summary>

### New Features
- **Mobile Support**: Full Android/iOS device support
- **Camera Capture**: Support direct camera photo upload
- **Gallery Selection**: Support selecting images from phone gallery
- **Modern UI**: Beautiful mobile selection dialog with hover animations and gradient effects

</details>

<details>
<summary><strong>v1.0.1</strong></summary>

### Improvements
- Enhanced drag & drop upload compatibility
- Optimized paste upload user experience
- Improved error handling and user feedback

</details>

<details>
<summary><strong>v1.0.0 (Initial Release)</strong></summary>

### Core Features
- **Multiple Upload Methods**: Support drag & drop, paste, and file selection
- **Flexible Configuration**: Multiple upload channels and naming options
- **Quick Integration**: Automatically insert Markdown image links after upload
- **Cross-Platform Support**: Support desktop usage
- **Smart Handling**: Prevents duplicate content from Obsidian's default image handling

</details>

## Development Info

- **Author**: fantasy-ke
- **License**: Apache 2.0
- **GitHub**: https://github.com/fantasy-ke

## Support

If you find this plugin helpful, please consider supporting the development:

- **Star this repository** on GitHub
- **Report bugs** and suggest features
- **Buy me a coffee** to support continued development

### Donation Methods

- **PayPal**: [Donate via PayPal](https://paypal.me/fantasyke)
- **ko-fi**: [Sponsor on ko-fi](https://ko-fi.com/fantasyke)
- **WeChat Pay**: 
  - <img src="https://filebed.fantasyke.cn/file/commonlyUsed/qrcode/qrcode-weichat.jpg" alt="微信支付" width="200" />
- **Alipay**: 
  - <img src="https://filebed.fantasyke.cn/file/commonlyUsed/qrcode/qrcode-alipay.jpg" alt="支付宝" width="200" />


## Contributing

Contributions are welcome! Please feel free to submit Issues and Pull Requests to improve this plugin.

## License

This project is licensed under the Apache License. See the [LICENSE](LICENSE) file for details.
