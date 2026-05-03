# 简单定投 Android 项目指南

本项目是通过 [Capacitor](https://capacitorjs.com/) 将 Web 版本转换而来的原生 Android 工程。

## 目录结构说明
- `/Web`: **Web 版本源码目录**。所有的 HTML、CSS、JS 修改都在这里进行。
- `/Android`: **安卓原生工程目录**。存放 Android Studio 项目源码。
- `capacitor.config.json`: Capacitor 配置文件，定义了 Web 目录和 App 信息。
- `package.json`: 包含快捷命令的配置文件。

## 如何运行与编译

### 1. 准备环境
确保你已安装以下工具：
- **Android Studio**: 用于编译、调试和打包。
- **Android SDK**: 建议使用 API 30+。

### 2. 使用 Android Studio 打开
1. 启动 Android Studio。
2. 选择 **Open an existing project**。
3. 浏览并选择本项目根目录下的 `Android` 文件夹。
4. 等待 Gradle 同步完成（这可能需要几分钟，取决于网络环境）。

### 3. 运行项目
1. 连接你的 Android 手机或启动一个模拟器。
2. 点击 Android Studio 顶部的工具栏中的 **Run**（绿色三角形图标）。

### 4. 更新 Web 代码
如果你修改了 `/Web` 目录下的代码：
1. 在终端执行快捷命令：
   ```bash
   npm run sync
   ```
   这会自动将最新的 Web 资源同步到安卓项目中。

### 5. 打包 APK
在 Android Studio 中：
1. 点击 **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**。
2. 编译完成后，点击右下角弹窗中的 **locate** 即可找到生成的 APK 文件。

## 注意事项
- **权限**: 如果后续需要访问摄像头、相册或精准定位，需要在 `Android/app/src/main/AndroidManifest.xml` 中添加相应权限声明。
- **图标**: 若要更换应用图标，请替换 `Android/app/src/main/res/mipmap-*` 目录下的图片。
