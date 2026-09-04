# DemoBlaze API — observed contract

Base URL: `https://api.demoblaze.com`

Everything below was verified against the live service while building this suite.
There is no published spec for this API; this file is the reference the client in
`src/api/demoblaze.client.ts` encodes, and the place to update when it drifts.

## Conventions and quirks

| Behaviour          | Detail                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Password encoding  | Base64 of the UTF-8 password, in the `password` field. Obfuscation, not security — the transport is what protects it. |
| Error signalling   | Failures return **HTTP 200** with `{"errorMessage": "..."}`. Status codes cannot be used as the success signal.       |
| Success bodies     | Sometimes a bare JSON string: `""` (signup) or `"Auth_token: <base64>"` (login).                                      |
| Non-JSON responses | Some inputs return an HTML error page (see DEMO-2). Always parse defensively.                                         |
| Cart ownership     | Server-side, keyed to the account. Two tests sharing an account share a cart.                                         |

## Endpoints

| Method | Path          | Request                                      | Success                                                     | Failure                                                         |
| ------ | ------------- | -------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| POST   | `/signup`     | `{username, password}`                       | `""`                                                        | `{"errorMessage":"This user already exist."}`                   |
| POST   | `/login`      | `{username, password}`                       | `"Auth_token: <token>"`                                     | `{"errorMessage":"Wrong password."}` / `"User does not exist."` |
| GET    | `/entries`    | —                                            | `{Items:[Product]}` — **first page only, 9 of 15 products** | —                                                               |
| POST   | `/bycat`      | `{cat}` — `phone` \| `notebook` \| `monitor` | `{Items:[Product]}`                                         | —                                                               |
| POST   | `/view`       | `{id}`                                       | `Product`                                                   | —                                                               |
| POST   | `/addtocart`  | `{id, cookie, prod_id, flag}`                | `""`                                                        | `{"errorMessage":"Token has expired"}` etc.                     |
| POST   | `/viewcart`   | `{cookie, flag:true}`                        | `{Items:[CartEntry]}`                                       | —                                                               |
| POST   | `/deleteitem` | `{id}`                                       | `"Item deleted."`                                           | —                                                               |

`cookie` is the auth token on the way in. On the way out, `/viewcart` echoes the
**username** in the same field — the server decodes the token. `id` on
`/addtocart` is a **client-generated** line-item id, so uniqueness is the
caller's responsibility; `newLineItemId()` owns it.

## Catalogue

`GET /entries` is paginated and returns only page one. The complete catalogue is
the union of the three category queries — 15 products — which is what
`listAllProducts()` computes. A lookup for any monitor against `/entries` alone
fails with a misleading "not in the catalogue".

One title carries a trailing newline (`"Sony vaio i7\n"`), so title comparisons
are trimmed on both sides.
