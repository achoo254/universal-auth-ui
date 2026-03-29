# universal-auth-ui

Drop-in Web Components for Firebase Authentication. Add Google, GitHub, and Microsoft sign-in to any web app with a single HTML tag.

**Framework-agnostic** | **~3KB gzipped** | **Shadow DOM isolated**

## Install

```bash
npm install universal-auth-ui firebase
```

## Quick Start

```html
<script type="module">
  import 'universal-auth-ui';
</script>

<auth-button provider="google"></auth-button>
```

## Components

### `<auth-button>`

Single branded sign-in button.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `provider` | `google\|github\|microsoft` | — | **Required.** Auth provider |
| `server-url` | string | — | POST token to this URL after auth |
| `api-key` | string | built-in | Custom Firebase API key |
| `auth-domain` | string | built-in | Custom Firebase auth domain |
| `theme` | `light\|dark` | `light` | Button theme |
| `size` | `small\|medium\|large` | `medium` | Button size |
| `label` | string | `Sign in with {Provider}` | Custom label text |

### `<auth-group>`

Renders multiple auth buttons from a comma-separated list.

| Attribute | Type | Default | Description |
|---|---|---|---|
| `providers` | comma-separated | `google` | Providers to display |
| `layout` | `vertical\|horizontal` | `vertical` | Button arrangement |
| `gap` | CSS value | `8px` | Space between buttons |

All `<auth-button>` attributes (theme, size, server-url, etc.) are passed through.

```html
<auth-group providers="google,github,microsoft" theme="dark" layout="horizontal"></auth-group>
```

## Events

| Event | Detail | Description |
|---|---|---|
| `auth-success` | `{ user, token, provider }` | Auth completed |
| `auth-error` | `{ error, provider }` | Auth failed |
| `server-response` | `{ response, status }` | Server POST result |

All events bubble and cross Shadow DOM (`composed: true`).

```js
document.addEventListener('auth-success', (e) => {
  console.log(e.detail.user);   // { uid, email, displayName, photoURL }
  console.log(e.detail.token);  // Firebase ID token (JWT)
});
```

## Custom Firebase Config

Override the built-in Firebase project:

```html
<auth-button
  provider="google"
  api-key="YOUR_API_KEY"
  auth-domain="your-project.firebaseapp.com"
></auth-button>
```

## Server Integration

```html
<auth-button provider="google" server-url="https://api.example.com/auth"></auth-button>
```

After successful auth, the component POSTs:

```json
{
  "user": { "uid": "...", "email": "...", "displayName": "...", "photoURL": "..." },
  "token": "eyJhbGci...",
  "provider": "google"
}
```

## Styling

CSS custom properties:

```css
auth-button {
  --auth-btn-border-radius: 8px;
  --auth-btn-font-family: 'Inter', sans-serif;
  --auth-btn-height: 44px;
  --auth-btn-font-size: 15px;
}
```

`::part(button)` for full control:

```css
auth-button::part(button) {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

## Framework Examples

**React:**
```jsx
<auth-button provider="google" onauth-success={(e) => handleAuth(e.detail)} />
```

**Vue:**
```html
<auth-button provider="google" @auth-success="handleAuth($event.detail)" />
```

**Svelte:**
```html
<auth-button provider="google" on:auth-success={(e) => handleAuth(e.detail)} />
```

## Security

Firebase API keys are **not secret** — they identify your project for client-side access. Security is enforced by Firebase Security Rules. See [Firebase docs](https://firebase.google.com/docs/projects/api-keys).

## License

MIT
