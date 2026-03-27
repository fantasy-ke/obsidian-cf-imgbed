# CF ImageBed - Obsidian 插件

<div align="center">

[English](README_EN.md) | [中文](README.md)

</div>

这是一个用于 Obsidian 的图片上传插件，可以将图片上传到 CloudFlare ImgBed 服务，支持本地图片上传、网络图片抓取上传，以及当前文档图片批量替换。

## 功能特性

- **多种上传方式**：支持拖拽、粘贴、右键选择和命令面板批量上传
- **网络图片接管**：开启后可将外链图片抓取并上传到自己的图床
- **批量替换**：支持一键上传当前文档中的图片并自动替换链接
- **灵活配置**：支持多种上传渠道和命名方式
- **排除列表**：可排除指定域名的网络图片，默认自动排除当前图床域名
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
   - **认证码** 或 **API Token**：二选一即可；如填写 API Token，将优先使用 Bearer Token 认证

### 2. 可选配置

- **上传渠道**：选择 `telegram`、`cfr2`、`s3`、`discord` 或 `huggingface`
- **渠道名称**：在多渠道部署下指定具体渠道实例
- **分块大小**：Telegram 默认 16MB，Discord 默认 8MB，仅在需要分块上传的渠道中显示
- **文件命名方式**：选择文件命名规则；`custom` 模式会先按占位符模板重命名，再以原文件名方式上传
- **返回链接格式**：选择返回的链接格式
- **上传目录**：指定上传到特定目录（可选），支持占位符
- **服务端压缩**：仅 Telegram 渠道可配置，是否启用服务端压缩
- **自动重试**：失败时是否自动切换渠道重试

### 2.2 高级设置补充

- **启用网络图片上传**：开启后，粘贴 markdown 外链图片、HTML `<img>` 或纯图片 URL 时，会先抓取原图再上传到自己的图床
- **网络图片排除域名**：支持逗号或换行分隔，命中列表的外链图片会直接跳过，避免重复上传
- **自动排除当前图床域名**：`API URL` 对应域名会自动加入排除范围，无需手动重复填写
- **备份路径**：启用本地备份后，备份路径也支持占位符

### 2.3 占位符说明

以下设置支持占位符：

- **自定义文件名模板**
- **上传目录**
- **备份路径**

#### 每个占位符的含义

| 占位符 | 含义 | 示例结果 |
| --- | --- | --- |
| `${noteFileName}` | 当前笔记文件名，不带 `.md` 扩展名 | `项目周报` |
| `${noteFolderName}` | 当前笔记所在文件夹名称 | `Projects` |
| `${noteFolderPath}` | 当前笔记所在文件夹路径 | `Notes/Projects` |
| `${noteFilePath}` | 当前笔记完整路径 | `Notes/Projects/项目周报.md` |
| `${originalAttachmentFileName}` | 原始附件文件名，不带扩展名 | `image` |
| `${originalAttachmentFileExtension}` | 原始附件扩展名，不带点号 | `png` |
| `${date}` | 当前日期，默认格式为 `YYYYMMDD` | `20260327` |
| `${time}` | 当前时间，默认格式为 `HHmmss` | `153045` |
| `${datetime}` | 当前日期和时间，默认格式为 `YYYYMMDD-HHmmss` | `20260327-153045` |
| `${timestamp}` | 当前毫秒级时间戳 | `1774596645123` |
| `${uuid}` | 随机 UUID | `550e8400-e29b-41d4-a716-446655440000` |

#### 补充说明

- `${noteFileName}`、`${noteFolderName}`、`${originalAttachmentFileName}` 这类字符串占位符支持简单格式，例如 `${noteFileName:{case:'lower'}}`、`${originalAttachmentFileName:{slugify:true}}`
- `${date}`、`${time}`、`${datetime}` 支持 `momentJsFormat`，例如 `${date:{momentJsFormat:'YYYY-MM-DD'}}`
- 可以混合使用多个占位符，例如 `${noteFileName}-${datetime}-${originalAttachmentFileName}`
- `custom` 命名模式的实际行为是：先按模板把文件重命名，再按“原文件名”方式上传

#### 常见模板示例

- **自定义文件名模板**：`${noteFileName}-${datetime}-${originalAttachmentFileName}`
- **上传目录**：`${noteFolderName}/${date}`
- **备份路径**：`backup/${noteFolderName}/${noteFileName}`

### 2.1 上传渠道说明

| 渠道类型 | 优点 | 限制 |
| --- | --- | --- |
| Telegram Bot | 完全免费、无限容量 | 大于 20MB 文件需分片存储 |
| Cloudflare R2 | 无文件大小限制、企业级性能 | 超出 10G 免费额度后收费，需要绑定支付方式 |
| S3 兼容存储 | 选择多样、价格灵活 | 根据服务商定价 |
| Discord | 完全免费、简单易用 | 大于 10MB 文件需分片存储 |
| HuggingFace | 完全免费、支持大文件直传 | 需要 HuggingFace 账号 |

### 3. 上传图片

插件支持五种常用方式：

#### 方式一：拖拽上传
1. 直接将图片文件拖拽到 Obsidian 编辑器中
2. 插件会自动上传并插入 Markdown 链接

#### 方式二：粘贴上传
1. 复制图片到剪贴板
2. 在 Obsidian 编辑器中按 `Ctrl+V`（Windows/Linux）或 `Cmd+V`（Mac）
3. 插件会自动上传并插入 Markdown 链接

#### 方式三：粘贴网络图片链接
1. 在高级设置中开启 **启用网络图片上传**
2. 复制 markdown 图片外链、HTML `<img>`，或直接复制图片 URL
3. 在编辑器中粘贴后，插件会抓取图片并上传到自己的图床
4. 上传成功后自动替换为新链接，失败则保留原内容

#### 方式四：右键上传
1. 在编辑器中右键选择"上传图片到 CF ImageBed"
2. 选择要上传的图片文件

#### 方式五：命令面板批量上传当前文档图片
1. 打开命令面板
2. 执行 **上传当前文档所有图片到 CF ImageBed**
3. 插件会扫描当前笔记中的 Markdown / Wiki 图片引用并批量上传
4. 如果已开启 **启用网络图片上传**，文档中的网络图片也会一并上传
5. 命中排除域名的网络图片会跳过，上传失败的图片保持原链接

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
- **认证**：支持上传认证码，或使用具备 `upload` 权限的 API Token（Bearer Token）
- **内容类型**：`multipart/form-data`

### 分块上传规则

- Telegram：默认分块大小为 **16MB**
- Discord：默认分块大小为 **8MB**
- HuggingFace：支持大文件直传，通常无需客户端分块
- Cloudflare R2 / S3：通常无需客户端分块

插件会根据所选渠道和文件大小自动决定是否走分块上传流程。

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
<summary><strong>v1.0.6 (最新版本)</strong></summary>

### 新功能与优化
- feat: 新增网络图片上传、排除域名列表和当前文档批量上传命令

#### 详细变更
- 新增高级设置开关，可控制是否接管网络图片上传
- 新增网络图片排除域名列表，默认自动排除当前 API 域名
- 支持粘贴 markdown 外链、HTML 图片和纯图片 URL 后自动抓取上传
- 新增命令面板操作，可批量上传当前文档中的图片并自动替换链接
- 批量处理和外链处理失败时保留原链接，避免误改内容

</details>

<details>
<summary><strong>v1.0.3</strong></summary>

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
