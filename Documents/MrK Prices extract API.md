The hidden WooCommerce API endpoint

Try this URL:

https://www.mrk.co.za/wp-json/wc/store/v1/products

This returns pure JSON of all products.

Example structure:

[
  {
    "id": 123,
    "name": "1 OZ Silver Krugerrand",
    "prices": {
      "price": "176228",
      "currency_code": "ZAR"
    }
  }
]

WooCommerce exposes this without authentication for product display.

2️⃣ Next.js fetch (SUPER simple)

You can now replace the entire scraper with:

export async function getMetalPrices() {

  const res = await fetch(
    "https://www.mrk.co.za/wp-json/wc/store/v1/products",
    { next: { revalidate: 300 } }
  )

  const products = await res.json()

  return products.map((p: any) => ({
    name: p.name,
    price: Number(p.prices.price) / 100,
    currency: p.prices.currency_code
  }))
}
3️⃣ Clean output

You’ll get something like:

[
  {
    "name": "1 OZ Silver Krugerrand",
    "price": 1762.28,
    "currency": "ZAR"
  },
  {
    "name": "1 OZ Gold Krugerrand",
    "price": 85764.48,
    "currency": "ZAR"
  }
]

Notice WooCommerce stores price in cents, so you divide by 100.

4️⃣ Even better: filter only metal products

WooCommerce allows filters like:

/wp-json/wc/store/v1/products?per_page=100

or sort by price:

/wp-json/wc/store/v1/products?orderby=price
5️⃣ Recommended architecture for your Next.js project
MRK WooCommerce API
        ↓
Next.js server fetch
        ↓
Transform prices
        ↓
Store in Supabase (optional)
        ↓
Frontend display

This avoids scraping entirely.

6️⃣ Example API route
/app/api/metals/route.ts
import { NextResponse } from "next/server"

export async function GET() {

  const res = await fetch(
    "https://www.mrk.co.za/wp-json/wc/store/v1/products"
  )

  const products = await res.json()

  const metals = products.map((p: any) => ({
    name: p.name,
    price: Number(p.prices.price) / 100
  }))

  return NextResponse.json(metals)
}

✅ Result:
No scraping.
Just clean JSON → Next.js → UI.


Updated: 2 min ago

