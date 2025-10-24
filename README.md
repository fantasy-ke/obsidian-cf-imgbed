# CF ImageBed - Obsidian 插件

<div align="center">

[English](README_EN.md) | [中文](README.md)

</div>

这是一个用于 Obsidian 的图片上传插件，可以将图片上传到 CloudFlare ImgBed 服务，支持多种上传方式和灵活的配置选项。

## 功能特性

- **多种上传方式**：支持拖拽、粘贴和选择文件上传
- **灵活配置**：支持多种上传渠道和命名方式
- **快速集成**：上传成功后自动插入 Markdown 图片链接
- **跨平台**：支持桌面端和移动端
- **智能处理**：防止 Obsidian 默认图片处理产生的重复内容
- **移动端优化**：支持相机拍照和相册选择，现代化UI设计

## 安装方法

### 手动安装

1. 下载 `main.js`、`manifest.json` 和 `styles.css` 文件
2. 将文件复制到你的 Obsidian 库的 `.obsidian/plugins/cf-imageBed/` 目录下
3. 重启 Obsidian 并启用插件

### 开发安装

1. 克隆此仓库
2. 确保 Node.js 版本至少为 v16
3. 运行 `npm install` 安装依赖
4. 运行 `npm run dev` 开始开发模式编译
5. 运行 `npm run build` 构建生产版本

## 使用方法

### 1. 配置插件

1. 打开 Obsidian 设置
2. 进入 **社区插件** 页面
3. 找到 **CF ImageBed** 插件并启用
4. 点击插件旁边的齿轮图标进入设置页面
5. 配置以下必要参数：
   - **API URL**：你的 CloudFlare ImgBed 服务地址（例如：`https://your.domain`）
   - **认证码**：你的上传认证码

### 2. 可选配置

- **上传渠道**：选择 `telegram`、`cfr2` 或 `s3`
- **文件命名方式**：选择文件命名规则
- **返回链接格式**：选择返回的链接格式
- **上传目录**：指定上传到特定目录（可选）
- **服务端压缩**：是否启用服务端压缩
- **自动重试**：失败时是否自动切换渠道重试

### 3. 上传图片

插件支持四种上传方式：

#### 方式一：拖拽上传
1. 直接将图片文件拖拽到 Obsidian 编辑器中
2. 插件会自动上传并插入 Markdown 链接

#### 方式二：粘贴上传
1. 复制图片到剪贴板
2. 在 Obsidian 编辑器中按 `Ctrl+V`（Windows/Linux）或 `Cmd+V`（Mac）
3. 插件会自动上传并插入 Markdown 链接

#### 方式三：右键上传
1. 在编辑器中右键选择"上传图片到 CF ImageBed"
2. 选择要上传的图片文件

### 4. 移动端使用

#### Android/iOS 设备
1. 在 Obsidian 设置中移动端工具栏添加`upload-image-mobile` **"📷 拍照或相册选择"** 
2. 点击工具栏按钮，选择图片来源：
   - **📷 拍照**：直接使用相机拍照上传
   - **🖼️ 从相册选择**：从手机相册选择图片
3. 图片会自动上传并插入到编辑器中

#### 移动端特色功能
- **智能设备检测**：自动识别移动设备并优化体验
- **现代化UI**：美观的选择对话框，支持悬停动画
- **相机集成**：支持直接拍照上传
- **相册选择**：快速从相册选择图片

## API 配置说明

本插件使用 CloudFlare ImgBed 的上传 API，支持以下参数：

- **端点**：`/upload`
- **方法**：`POST`
- **认证**：使用上传认证码
- **内容类型**：`multipart/form-data`

详细 API 文档请参考 CloudFlare ImgBed 官方[文档](https://cfbed.sanyue.de/api/upload.html).。

## 故障排除

### 常见问题

1. **上传失败**
   - 检查 API URL 和认证码是否正确配置
   - 确认网络连接正常
   - 检查 CloudFlare ImgBed 服务是否正常运行

2. **图片无法显示**
   - 确认返回的链接格式正确
   - 检查域名配置是否正确

3. **拖拽上传不工作**
   - 确保插件已正确启用
   - 重启 Obsidian 后重试

## 版本更新历史

<details>
<summary><strong>v1.0.3 (最新版本)</strong></summary>

### 新增功能
- **移动端支持**：完整的 Android/iOS 设备支持
- **相机拍照**：支持直接使用手机相机拍照上传
- **相册选择**：支持从手机相册选择图片上传
- **现代化UI**：美观的移动端选择对话框，支持悬停动画和渐变效果

</details>

<details>
<summary><strong>v1.0.1</strong></summary>

### 🔧 功能优化
- 改进拖拽上传的兼容性
- 优化粘贴上传的用户体验
- 增强错误处理和用户反馈

</details>

<details>
<summary><strong>v1.0.0 (初始版本)</strong></summary>

### 核心功能
- **多种上传方式**：支持拖拽、粘贴、选择文件上传
- **灵活配置**：支持多种上传渠道和命名方式
- **快速集成**：上传成功后自动插入 Markdown 图片链接
- **跨平台支持**：支持桌面端使用
- **智能处理**：防止 Obsidian 默认图片处理产生的重复内容

</details>

## 开发信息

- **作者**：fantasy-ke
- **许可证**：Apache 2.0
- **GitHub**：https://github.com/fantasy-ke

## 支持

如果你觉得这个插件有用，请考虑支持开发：

- **给这个仓库点星** 在 GitHub 上
- **报告错误** 和建议功能
- **请我喝咖啡** 支持持续开发

### 打赏方式

- **PayPal**: [通过 PayPal 打赏](https://paypal.me/fantasyke)
- **ko-fi**: [在 ko-fi 上赞助](https://ko-fi.com/fantasyke)
- **微信支付**: 
  - <img src="https://filebed.fantasyke.cn/file/commonlyUsed/qrcode/qrcode-weichat.jpg" alt="微信支付" width="200" />
- **支付宝**: 
  - <img src="https://filebed.fantasyke.cn/file/commonlyUsed/qrcode/qrcode-alipay.jpg" alt="支付宝" width="200" />


## 贡献

欢迎贡献！请随时提交 Issue 和 Pull Request 来改进这个插件。

## 许可证

本项目采用 Apache 许可证。详情请查看 [LICENSE](LICENSE) 文件。
