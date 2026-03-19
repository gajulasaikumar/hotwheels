const CART_STORAGE_KEY = "hot_wheels_cart_v1";
const PRODUCT_DATA_PATH = "./products.json";
const EXCEL_FILE_PATH = "./inventory.xlsx";
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80";

const fallbackProducts = [
  { id: 1, name: "Nissan Skyline GT-R R34", brand: "Hot Wheels", category: "Premium", price: 1499, condition: "Carded Mint", stock: 3, image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=80" },
  { id: 2, name: "Toyota Supra MK4", brand: "Hot Wheels", category: "Mainline", price: 699, condition: "Carded Mint", stock: 7, image: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80" },
  { id: 3, name: "Porsche 911 GT3 RS", brand: "Hot Wheels", category: "Boulevard", price: 1299, condition: "Near Mint", stock: 4, image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80" }
];

const productDetail = document.getElementById("productDetail");
const relatedGrid = document.getElementById("relatedGrid");
const detailToast = document.getElementById("detailToast");
const detailToastText = document.getElementById("detailToastText");

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valueFromAliases(row, aliases) {
  const normalized = {};
  Object.keys(row).forEach((key) => {
    normalized[normalizeKey(key)] = row[key];
  });

  for (const alias of aliases) {
    const found = normalized[normalizeKey(alias)];
    if (found !== undefined && String(found).trim() !== "") return found;
  }
  return "";
}

function parsePrice(raw) {
  const cleaned = String(raw || "").replace(/[^0-9.]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function parseStock(raw) {
  const cleaned = String(raw || "").replace(/[^0-9-]/g, "");
  const value = Number.parseInt(cleaned, 10);
  return Number.isFinite(value) ? value : 0;
}

function mapRowToProduct(row, index) {
  const name = String(valueFromAliases(row, ["name", "title", "model", "car", "itemname"])).trim();
  const brand = String(valueFromAliases(row, ["brand", "make", "manufacturer"])).trim() || "Hot Wheels";
  const category = String(valueFromAliases(row, ["category", "series", "type", "line"])).trim() || "Mainline";
  const condition = String(valueFromAliases(row, ["condition", "cardcondition"])).trim() || "Carded Good";
  const image = String(valueFromAliases(row, ["image", "imageurl", "pic", "photo", "url"])).trim() || PLACEHOLDER_IMAGE;
  const idRaw = valueFromAliases(row, ["id", "sku", "productid"]);
  const priceRaw = valueFromAliases(row, ["price", "sellingprice", "mrp", "amount"]);
  const stockRaw = valueFromAliases(row, ["stock", "quantity", "qty", "available"]);
  const id = Number.parseInt(String(idRaw), 10);

  return {
    id: Number.isFinite(id) ? id : index + 1,
    name,
    brand,
    category,
    price: parsePrice(priceRaw),
    condition,
    stock: parseStock(stockRaw),
    image
  };
}

function formatPrice(value) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function getProductIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(product) {
  if (product.stock <= 0) return;
  const cart = readCart();
  const found = cart.find((item) => item.productId === product.id);
  if (found) {
    if (found.qty >= product.stock) {
      alert("Only limited stock available.");
      return;
    }
    found.qty += 1;
  } else {
    cart.push({ productId: product.id, qty: 1 });
  }
  saveCart(cart);
  detailToastText.textContent = `${product.name} added to cart`;
  detailToast.hidden = false;
  setTimeout(() => {
    detailToast.hidden = true;
  }, 2400);
}

function renderProduct(product) {
  const buttonDisabled = product.stock <= 0 ? "disabled" : "";
  const stockText = product.stock <= 0 ? "Sold Out" : `In stock: ${product.stock}`;
  productDetail.innerHTML = `
    <article class="detail-card">
      <div class="detail-image-wrap">
        <img src="${product.image || PLACEHOLDER_IMAGE}" alt="${product.name}">
      </div>
      <div class="detail-info">
        <p class="eyebrow">${product.category}</p>
        <h1>${product.name}</h1>
        <p class="meta">${product.brand} | ${product.condition}</p>
        <p class="detail-stock">${stockText}</p>
        <p class="detail-price">${formatPrice(product.price)}</p>
        <div class="hero-actions">
          <button id="detailAddBtn" class="btn-primary" ${buttonDisabled}>Add to Cart</button>
          <a class="btn-secondary" href="index.html#hotwheels">Continue Shopping</a>
        </div>
      </div>
    </article>
  `;

  const addBtn = document.getElementById("detailAddBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => addToCart(product));
  }
}

function renderRelated(products, currentProduct) {
  const related = products
    .filter((item) => item.id !== currentProduct.id && item.category === currentProduct.category)
    .slice(0, 4);

  if (!related.length) {
    relatedGrid.innerHTML = "<p>No related products found.</p>";
    return;
  }

  relatedGrid.innerHTML = related
    .map((item) => `
      <a href="product.html?id=${item.id}" class="tile product-link">
        <h4>${item.name}</h4>
        <p>${item.category} | ${formatPrice(item.price)}</p>
      </a>
    `)
    .join("");
}

async function loadProducts() {
  if (typeof XLSX !== "undefined") {
    try {
      const excelResponse = await fetch(EXCEL_FILE_PATH, { cache: "no-store" });
      if (excelResponse.ok) {
        const buffer = await excelResponse.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
        const mapped = rows
          .map((row, index) => mapRowToProduct(row, index))
          .filter((item) => item.name && Number.isFinite(item.price));
        if (mapped.length) return mapped;
      }
    } catch (error) {
      // Continue to JSON fallback if Excel is not found or invalid.
    }
  }

  try {
    const response = await fetch(PRODUCT_DATA_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error("Cannot load products");
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Invalid products data");
    return data.map((item, index) => ({
      ...item,
      id: Number.isFinite(Number(item.id)) ? Number(item.id) : index + 1,
      image: item.image || PLACEHOLDER_IMAGE
    }));
  } catch {
    return fallbackProducts;
  }
}

async function init() {
  const products = await loadProducts();
  const productId = getProductIdFromQuery();
  const selected = products.find((item) => item.id === productId) || products[0];
  if (!selected) {
    productDetail.innerHTML = "<p>Product not found.</p>";
    return;
  }
  renderProduct(selected);
  renderRelated(products, selected);
}

init();
