# NeatChat-Plus
>感谢原作者们的付出，本仓库由 NextChat 和 NeatChat修改，添加了一些我认为比较好的功能。
>原仓库：https://github.com/tianzhentech/NeatChat，我将同步保持与此仓库的更新。

<div align="center">


![](https://raw.githubusercontent.com/tianzhentech/static/main/images/NeatChat-Dark.svg)

![Stars](https://img.shields.io/github/stars/kiritoko1029/NeatChat-Plus)
![Forks](https://img.shields.io/github/forks/kiritoko1029/NeatChat-Plus)
![Web](https://img.shields.io/badge/Web-PWA-orange?logo=microsoftedge)
![Web](https://img.shields.io/badge/-Windows-blue?logo=windows)
![Release Badge](https://img.shields.io/github/v/release/kiritoko1029/NeatChat-Plus.svg)
![License](https://img.shields.io/github/license/kiritoko1029/NeatChat-Plus.svg)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kiritoko1029/NeatChat-Plus.git)

简体中文 | [English](README.en.md)

基于 NextChat 深度重构，一个更优雅、更强大的 AI 对话解决方案
</div>

## 🛠️ 自定义配置

除了常规的API密钥配置外，NeatChat还支持以下自定义选项，只需在`.env`文件中添加相应变量：

| 变量名                | 说明                                  | 默认值                      | 示例                                     |
| --------------------- | ------------------------------------- | --------------------------- | ---------------------------------------- |
| `SIDE_BAR_TITLE`      | 自定义侧边栏标题                      | "NeatChat"                  | `SIDE_BAR_TITLE=我的AI助手`              |
| `SIDE_BAR_LOGO_URL`   | 自定义侧边栏LOGO图片URL               | 默认使用内置NeatIcon        | `SIDE_BAR_LOGO_URL=https://example.com/logo.png` |
| `HITOKOTO_URL`        | 一言API地址                           | 无（不启用一言功能）        | `HITOKOTO_URL=https://v1.hitokoto.cn`    |
| `ENABLE_ONLINE_MEMBER`| 是否启用在线人数统计                  | false                       | `ENABLE_ONLINE_MEMBER=true`              |

### 一言API

当配置`HITOKOTO_URL`时，系统会从该API获取一言内容并显示在侧边栏副标题位置。一言内容支持点击刷新，也支持文本选择复制。

API返回格式应为：
```json
{
  "hitokoto": "一言内容",
  "from": "来源",
  "from_who": "作者"
}
```

### 在线人数统计

启用`ENABLE_ONLINE_MEMBER=true`后，系统会自动统计并显示当前访问网站的用户数量，该功能使用浏览器指纹技术确保计数准确性。

1. 支持vercel一键部署：[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kiritoko1029/NeatChat-Plus.git)

2. docker只需要替换官方**yidadaa/chatgpt-next-web:版本号**为**kiritoko1029/chatgpt-next-web:latest**即可

<a>

 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=kiritoko1029/NeatChat-Plus&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=kiritoko1029/NeatChat-Plus&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=kiritoko1029/NeatChat-Plus&type=Date" />
 </picture>

</a>