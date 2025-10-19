# CF ImageBed - Obsidian Plugin

<div align="center">

[English](README.md) | [中文](README_CN.md)

</div>

An Obsidian plugin for uploading images to CloudFlare ImgBed service with multiple upload methods and flexible configuration options.

## Features

- 🖼️ **Multiple Upload Methods**: Support drag & drop, paste, and file selection
- ⚙️ **Flexible Configuration**: Multiple upload channels and naming options
- 🚀 **Quick Integration**: Automatically insert Markdown image links after upload
- 📱 **Cross-Platform**: Support desktop and mobile devices
- 🎯 **Smart Handling**: Prevents duplicate content from Obsidian's default image handling

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
   - **Auth Code**: Your upload authentication code

### 2. Optional Configuration

- **Upload Channel**: Choose `telegram`, `cfr2`, or `s3`
- **File Naming**: Select file naming rules
- **Return Format**: Choose return link format
- **Upload Folder**: Specify upload directory (optional)
- **Server Compression**: Enable server-side compression
- **Auto Retry**: Automatically switch channels on failure

### 3. Upload Images

The plugin supports four upload methods:

#### Method 1: Command Palette
1. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (Mac) to open command palette
2. Type "Upload image to CF ImageBed" and select
3. Choose the image file to upload

#### Method 2: Drag & Drop
1. Drag image files directly to Obsidian editor
2. Plugin will automatically upload and insert Markdown links

#### Method 3: Paste Upload
1. Copy image to clipboard
2. Press `Ctrl+V` (Windows/Linux) or `Cmd+V` (Mac) in Obsidian editor
3. Plugin will automatically upload and insert Markdown links

#### Method 4: Right-click Upload
1. Right-click in editor and select "Upload image to CF ImageBed"
2. Choose the image file to upload

## API Configuration

This plugin uses CloudFlare ImgBed's upload API with the following parameters:

- **Endpoint**: `/upload`
- **Method**: `POST`
- **Authentication**: Upload authentication code
- **Content Type**: `multipart/form-data`

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

## Development Info

- **Author**: fantasy-ke
- **Version**: 1.0.0
- **License**: MIT
- **GitHub**: https://github.com/fantasy-ke

## Support

If you find this plugin helpful, please consider supporting the development:

- ⭐ **Star this repository** on GitHub
- 🐛 **Report bugs** and suggest features
- 💖 **Buy me a coffee** to support continued development

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
