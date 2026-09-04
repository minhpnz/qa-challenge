/** Contracts observed against https://api.demoblaze.com — see docs/api-contract.md. */

export interface Product {
  id: number;
  cat: string;
  title: string;
  price: number;
  desc: string;
  img: string;
}

export interface ProductList {
  Items: Product[];
}

export interface CartEntry {
  /** The API echoes the *username* here, not the auth token. */
  cookie: string;
  /** Client-generated line-item id. The client, not the server, owns uniqueness. */
  id: string;
  prod_id: number;
}

export interface CartContents {
  Items: CartEntry[];
}

export interface ApiErrorBody {
  errorMessage: string;
}

export type Category = 'phone' | 'notebook' | 'monitor';

export interface Credentials {
  username: string;
  password: string;
}

export type LoginResult =
  | { readonly ok: true; readonly token: string }
  | { readonly ok: false; readonly errorMessage: string };

export type SignupResult =
  { readonly ok: true } | { readonly ok: false; readonly errorMessage: string };
