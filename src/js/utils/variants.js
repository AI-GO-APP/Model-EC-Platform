/**
 * 示範商城 — 產品規格引擎
 * 處理 SKU 變體矩陣、庫存計算、規格連動
 */

/**
 * 根據已選規格篩選可用變體
 * @param {Object} product - 商品物件
 * @param {Object} selectedOptions - 已選規格，例如 { 0: 'black', 1: 'm' }
 * @returns {Array} 匹配的變體列表
 */
export function getAvailableVariants(product, selectedOptions) {
  if (!product.variants) return [];
  return product.variants.filter(variant => {
    return Object.entries(selectedOptions).every(([index, value]) => {
      if (!value) return true;
      return variant.options[parseInt(index)] === value;
    });
  });
}

/**
 * 精確匹配規格組合取得對應變體
 * @param {Object} product - 商品物件
 * @param {Array} options - 已選規格值陣列，例如 ['black', 'm']
 * @returns {Object|null} 對應的變體，或 null
 */
export function getVariantByOptions(product, options) {
  if (!product.variants) return null;
  return product.variants.find(v =>
    v.options.length === options.length &&
    v.options.every((opt, i) => opt === options[i])
  ) || null;
}

/**
 * 取得庫存狀態
 * @param {Object} variant - 變體物件
 * @returns {'in_stock'|'low_stock'|'out_of_stock'} 庫存狀態
 */
export function getInventoryStatus(variant) {
  if (!variant || variant.inventory <= 0) return 'out_of_stock';
  if (variant.inventory <= 5) return 'low_stock';
  return 'in_stock';
}

/**
 * 取得庫存狀態的顯示文字
 */
export function getInventoryLabel(variant, lang = 'zh-TW') {
  const status = getInventoryStatus(variant);
  const labels = {
    'zh-TW': {
      in_stock: '有庫存',
      low_stock: `僅剩 ${variant?.inventory || 0} 件`,
      out_of_stock: '已售完',
    },
    en: {
      in_stock: 'In Stock',
      low_stock: `Only ${variant?.inventory || 0} left`,
      out_of_stock: 'Sold Out',
    },
  };
  return (labels[lang] || labels['zh-TW'])[status];
}

/**
 * 計算商品的價格範圍
 * @param {Object} product - 商品物件
 * @returns {{ low: number, high: number }}
 */
export function getPriceRange(product) {
  if (!product.variants || product.variants.length === 0) {
    return { low: product.basePrice, high: product.basePrice };
  }
  const prices = product.variants.map(v => v.price);
  return {
    low: Math.min(...prices),
    high: Math.max(...prices),
  };
}

/**
 * 取得因庫存為 0 而應禁用的規格選項
 * @param {Object} product - 商品物件
 * @param {Object} selectedOptions - 已選規格 { optionIndex: value }
 * @param {number} targetOptionIndex - 要檢查的規格維度索引
 * @returns {Set<string>} 應禁用的選項值集合
 */
export function getDisabledOptions(product, selectedOptions, targetOptionIndex) {
  if (!product.variants || !product.options) return new Set();
  
  const disabled = new Set();
  const option = product.options[targetOptionIndex];
  if (!option) return disabled;

  for (const optionValue of option.values) {
    // 建構假設的選擇狀態
    const testOptions = { ...selectedOptions, [targetOptionIndex]: optionValue.id };
    
    // 找出所有匹配此假設的變體
    const matchingVariants = product.variants.filter(variant => {
      return Object.entries(testOptions).every(([idx, val]) => {
        if (!val) return true;
        return variant.options[parseInt(idx)] === val;
      });
    });

    // 如果所有匹配的變體都庫存為 0，則禁用此選項
    if (matchingVariants.length > 0 && matchingVariants.every(v => v.inventory <= 0)) {
      disabled.add(optionValue.id);
    }
    // 如果不存在此組合，也禁用
    if (matchingVariants.length === 0) {
      disabled.add(optionValue.id);
    }
  }

  return disabled;
}

/**
 * 商品是否完全售完
 */
export function isProductSoldOut(product) {
  if (!product.variants || product.variants.length === 0) return false;
  return product.variants.every(v => v.inventory <= 0);
}

/**
 * 格式化價格
 */
export function formatPrice(amount, lang = 'zh-TW') {
  const currency = lang === 'zh-TW' ? 'NT$' : 'USD $';
  return `${currency}${amount.toLocaleString()}`;
}

/**
 * 格式化價格範圍
 */
export function formatPriceRange(product, lang = 'zh-TW') {
  const range = getPriceRange(product);
  if (range.low === range.high) {
    return formatPrice(range.low, lang);
  }
  return `${formatPrice(range.low, lang)} - ${formatPrice(range.high, lang)}`;
}
