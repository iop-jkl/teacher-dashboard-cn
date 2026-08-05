# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## 访客（演示）模式

访客可查看全部功能，但隐私数据（姓名、身份证、家长信息）在界面与导出中一律脱敏，且所有写入操作被禁用（数据层由 RLS 只读策略兜底）。

### 部署步骤

1. 在 Supabase SQL Editor 中执行 `supabase/migrations/0015_guest_access.sql`（为 6 张表添加 guest 只读策略，并重写 `get_grade_summary()` 支持 guest）。
2. 创建访客账号（默认密码 `guest123`，可用 `--password=` 重置）：

   ```
   node scripts/create-guest-user.mjs
   node scripts/create-guest-user.mjs --password=yourpass
   ```

3. 使用 `guest` / 设置的密码 通过普通登录表单登录。

### 安全说明

- 访客账号通过 `app_metadata.role='guest'` 识别（app_metadata 仅服务端可改，用户无法伪造）。
- RLS 只授予 guest `select` 权限，无任何写策略，即使绕过前端也无法增删改。
- 前端脱敏规则见 `src/lib/privacy.ts`（姓名 → 学生+身份证哈希代号，身份证/家长信息 → 星号）。


Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```
