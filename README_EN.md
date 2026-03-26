# CF ImageBed - Obsidian Plugin

<div align="center">

[English](README_EN.md) | [中文](README.md)

</div>

An Obsidian plugin for uploading images to CloudFlare ImgBed service with multiple upload methods and flexible configuration options.

## Features

- **Multiple Upload Methods**: Support drag & drop, paste, and file selection
- **Flexible Configuration**: Multiple upload channels and naming options
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
- **Chunk Size**: Telegram defaults to 16MB, Discord defaults to 8MB; only shown for chunk-capable channels
- **File Naming**: Select file naming rules
- **Return Format**: Choose return link format
- **Upload Folder**: Specify upload directory (optional)
- **Server Compression**: Only configurable for the Telegram channel
- **Auto Retry**: Automatically switch channels on failure

### 2.1 Upload channel overview

| Channel | Advantages | Limitations |
| --- | --- | --- |
| Telegram Bot | Completely free, effectively unlimited capacity | Files larger than 20MB require chunk storage |
| Cloudflare R2 | No file size limit, enterprise-grade performance | Billing is required after the 10GB free tier |
| S3 compatible storage | Flexible vendors and pricing | Pricing depends on the provider |
| Discord | Completely free and easy to use | Files larger than 10MB require chunk storage |
| HuggingFace | Completely free and supports large direct uploads | Requires a HuggingFace account |

### 3. Upload Images

The plugin supports three upload methods:

#### Method 1: Drag & Drop
1. Drag image files directly to Obsidian editor
2. Plugin will automatically upload and insert Markdown links

#### Method 2: Paste Upload
1. Copy image to clipboard
2. Press `Ctrl+V` (Windows/Linux) or `Cmd+V` (Mac) in Obsidian editor
3. Plugin will automatically upload and insert Markdown links

#### Method 3: Right-click Upload
1. Right-click in editor and select "Upload image to CF ImageBed"
2. Choose the image file to upload

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
<summary><strong>v1.0.4 (Latest)</strong></summary>

### Features & Improvements
- feat: Add watermark and compression features; enhance settings UI and validation

#### Detailed Changes
- New client-side watermark and compression processing
- Added settings validation to ensure configuration correctness
- Optimized settings UI with tabs and styles
- Updated type definitions to include new configuration items
- Added file type and size validation
- Perform watermark and compression before upload

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
