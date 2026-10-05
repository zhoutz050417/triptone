# 旅色 TripTone

一个操作简单的旅行照片氛围调色网页。上传照片，一次查看四种效果，调节浓度，对比原图，下载喜欢的结果。

[在线体验](https://zhoutz050417.github.io/triptone/) · [GitHub 仓库](https://github.com/zhoutz050417/triptone)

## 第一版功能

- 暖调胶片、清透海边、情绪冷灰、柔和暮色四种像素调色。
- JPG / PNG / WEBP 上传，支持拖放，单张最大 30 MB。
- 四种滤镜缩略图、0–100% 强度、原图滑动对比。
- 基于照片亮度的自动曝光修正，可以关闭。
- JPG / PNG 导出；保留原始比例，最长边不超过 4096 像素，不放大小图。
- 手机与电脑布局，无登录、无付费、无后端图片上传。

## 运行

需要 Python 3；应用本身没有第三方依赖。

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

打开 `http://127.0.0.1:4173`。也可以在具备 Node.js / npm 的环境中使用 `npm start`。请使用 HTTP 服务运行，直接双击 HTML 文件可能无法加载 JavaScript 模块。

## 检查

需要 Node.js 18 或更新版本。

```sh
npm test
npm run check
```

测试覆盖零强度还原、透明度保留、风格差异、确定性、尺寸限制、曝光修正和无效输入。

## 调色参考

根据用户提供的「未知海」[调色分享](https://www.douyin.com/note/7642953454575577265) 调整了「情绪冷灰」：降低曝光、减少色彩强度、保留冷色，并减少自动补光对暗调的抵消。参数与观察记录见 [REFERENCE.md](REFERENCE.md)。这是参考风格的近似实现；不同软件的参数刻度并不相同，不能把数字直接当作同一个算法。

## 实现

原生 HTML、CSS、JavaScript 与 Canvas。`dist/filters.js` 是纯像素算法，包含曲线、对比度、饱和度、色彩偏移、暗角与颗粒；`dist/app.js` 负责图片读取、预览、交互与导出。预览最长边为 1400 像素，导出直接使用原始解码图片重绘，不会把预览图放大。

照片只在浏览器内存中处理，不存储、不发送到服务器。静态网站托管服务仍会接收正常页面访问请求。

**当前版本没有训练或调用 AI 模型。** 自动调整是亮度统计规则，简历中应描述为图像处理应用。后续可加入 AI 场景识别、自动推荐风格、分区域调色，并以效果、延迟与用户反馈评估收益。

## 文件

```text
dist/
  index.html       页面
  style.css        响应式样式
  app.js           交互与导出
  filters.js       调色算法
  assets/          示例照片与图标
tests/             算法测试
```

## GitHub 与部署

将本目录作为仓库根目录即可。已提供 `.github/workflows/pages.yml`：推送到 `main` 后先运行检查，再将 `dist/` 发布到 GitHub Pages。在仓库 Settings → Pages → Source 中选择 GitHub Actions。当前已发布到 [GitHub Pages](https://zhoutz050417.github.io/triptone/)，2026-10-06 已通过远程检查及 Chrome 实际上传、滤镜切换和 JPG 导出验证。此配置按 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) 编写。

`.openai/hosting.json` 是旧 Sites 托管的配置，迁移到其他服务时不需要它。旧 `chatgpt.site` 地址反复出现 Cloudflare 403，部署成功不能证明访问正常；当前工具无法管理该域名的防火墙规则，不将它作为可用的演示地址。照片处理不需要账号、API key 或模型费用。

## 无需服务器的离线版本

运行 `node scripts/build-offline.mjs`，在本目录的上级生成 `triptone-offline.html`。双击该文件即可使用；脚本将样片、样式和 JavaScript 一起打包，无需启动服务，也不请求 `chatgpt.site`。请用浏览器打开，勿用文件预览器。修改应用后重新生成即可更新离线版本。

建议在仓库中展示多种光线下的实际对比图、失败样例和算法说明，避免把固定滤镜写成 AI 模型。后续的场景识别也应与当前版本分开描述。

## 已知限制

- 尚未复刻某个指定平台滤镜；四种风格为自定义参数。
- HEIC、动画图片不支持。PNG 保留透明度；JPG 透明区域填白。
- 输入像素上限 5000 万；大图可能需要较多内存，导出最大边为 4096。
- 照片重新编码后不保留 EXIF 等相机元数据，也不提供 RAW / HDR 工作流。
- 浏览器预览和导出受颜色管理影响，颗粒在不同分辨率下有细微差别。
- 固定调色在不同光线或肤色下可能需要微调，当前不包含人像分割。

示例照片来源：[Unsplash 图片源](https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1)；使用应遵守 [Unsplash License](https://unsplash.com/license)。
