import { Menu, app, type BrowserWindow } from "electron";

export function createAppMenu(_mainWindow: BrowserWindow | null): void {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const, label: "关于 FreeClaw" },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const, label: "隐藏 FreeClaw" },
              { role: "hideOthers" as const, label: "隐藏其他" },
              { role: "unhide" as const, label: "显示全部" },
              { type: "separator" as const },
              { role: "quit" as const, label: "退出 FreeClaw" },
            ],
          } satisfies Electron.MenuItemConstructorOptions,
        ]
      : []),

    // 编辑 menu
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { type: "separator" },
        { role: "selectAll", label: "全选" },
      ],
    },

    // 视图 menu
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "forceReload", label: "强制重新加载" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "全屏" },
      ],
    },

    // 窗口 menu
    {
      label: "窗口",
      submenu: isMac
        ? [
            { role: "minimize", label: "最小化" },
            { role: "zoom", label: "缩放" },
            { type: "separator" },
            { role: "front", label: "全部置于顶层" },
          ]
        : [
            { role: "minimize", label: "最小化" },
            { role: "close", label: "关闭" },
          ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
