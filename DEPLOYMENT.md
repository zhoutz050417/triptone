# 访问故障与迁移记录

排查日期：2026-10-05（北京时间）。

## 已确认

- 原地址 `https://triptone-photo-lab.zhoutz050417.chatgpt.site/` 返回 HTTP 403，响应页面为 Cloudflare 的 “Sorry, you have been blocked”。
- 本次响应 Ray ID：`a45d49712a1b2f4f-LAX`；请求响应时间：2026-10-05 14:58:51 UTC。
- Sites 后台状态为 active，没有停用标记；当前账号是 owner，访问范围为 custom。
- 最近 24 小时的 Worker 错误日志为空。空日志不能证明请求一定未进入应用，但没有发现应用异常的证据。
- 当前可用 Sites 接口不提供该域名的防火墙规则、命中规则或解除拦截操作。具体拦截原因仍未知，不能断言由 IP、地区、代理或浏览器造成。

Cloudflare 的 [403 官方说明](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-403/) 列出了安全规则等多种原因；修复需要域名管理方查看规则及安全事件。没有修改网页代码、重复部署、清理缓存就能永久解决的证据。

## 本地使用

`node scripts/build-offline.mjs` 生成上级目录中的 `triptone-offline.html`。使用 Chrome 打开这个文件，无需服务器、登录或网络访问。它包含原有页面、像素算法和样片；不会请求旧托管域名。

## GitHub Pages 迁移

已经准备 `.github/workflows/pages.yml`，流程为：推送 main → 测试 → 语法检查 → 上传 dist → 发布 Pages。网页资源使用相对路径，可部署到仓库子路径。流程依据 [GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

尚未完成：当前浏览器未登录 GitHub，也没有可用的已认证发布工具。需要用户登录后创建或选择仓库，将源码上传，再在 Settings → Pages → Source 中选择 GitHub Actions。部署成功后须在用户的 Chrome 中实际打开新网址、验证照片选择与导出，才算完成线上迁移。

原 Sites 访问范围保持不变，未改为公开。GitHub 发布时不要上传 `.git/`、`.openai/` 或本地照片；源码包已排除这些托管及本地元数据。GitHub Pages 自身也受访问网络及平台可用性影响，不能保证任何网络环境下永远可访问。
