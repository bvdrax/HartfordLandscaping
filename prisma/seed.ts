import {
  PrismaClient, Role, ProjectType, ProjectStatus, CustomerPersona,
  PayType, QuoteStatus, InvoiceStatus, InvoiceType, PaymentMethod,
  ReceiptStatus, ChangeOrderStatus, TaskStatus,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const pw = await bcrypt.hash('devpassword', 10)
  console.log('🌱 Seeding database...')

  // ── Global Settings ───────────────────────────────────────────────────────
  await prisma.globalSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      defaultMarginPct: 35,
      defaultTaxRate: 0.0875,
      companyName: 'Hartford Landscaping',
      companyPhone: '(860) 555-0100',
      companyEmail: 'info@hartfordlandscaping.com',
      companyAddress: '88 Asylum Ave, Hartford, CT 06103',
    },
  })

  // ── Staff Users ───────────────────────────────────────────────────────────
  const benedict = await prisma.user.upsert({
    where: { email: 'benedict@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-benedict', email: 'benedict@hartfordlandscaping.com', firstName: 'Benedict', lastName: 'Varela', phone: '(860) 555-1001', role: Role.OWNER, isActive: true, passwordHash: pw },
  })

  const alex = await prisma.user.upsert({
    where: { email: 'alex@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-alex', email: 'alex@hartfordlandscaping.com', firstName: 'Alex', lastName: 'Varela', phone: '(860) 555-1002', role: Role.OWNER, isActive: true, passwordHash: pw },
  })

  const sandra = await prisma.user.upsert({
    where: { email: 'sandra@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-sandra', email: 'sandra@hartfordlandscaping.com', firstName: 'Sandra', lastName: 'Kim', phone: '(860) 555-1003', role: Role.ACCOUNTANT, isActive: true, passwordHash: pw },
  })

  const marcus = await prisma.user.upsert({
    where: { email: 'marcus@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-marcus', email: 'marcus@hartfordlandscaping.com', firstName: 'Marcus', lastName: 'Rivera', phone: '(860) 555-1004', role: Role.PROJECT_MANAGER, isActive: true, passwordHash: pw },
  })

  await prisma.user.upsert({
    where: { email: 'admin@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-admin', email: 'admin@hartfordlandscaping.com', firstName: 'Dev', lastName: 'Admin', phone: '(860) 555-1000', role: Role.PLATFORM_ADMIN, isActive: true, passwordHash: pw },
  })

  const darius = await prisma.user.upsert({
    where: { email: 'darius@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-darius', email: 'darius@hartfordlandscaping.com', firstName: 'Darius', lastName: 'Thompson', phone: '(860) 555-2001', role: Role.FIELD_WORKER, isActive: true, passwordHash: pw },
  })

  const elena = await prisma.user.upsert({
    where: { email: 'elena@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-elena', email: 'elena@hartfordlandscaping.com', firstName: 'Elena', lastName: 'Ruiz', phone: '(860) 555-2002', role: Role.FIELD_WORKER, isActive: true, passwordHash: pw },
  })

  const jamal = await prisma.user.upsert({
    where: { email: 'jamal@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-jamal', email: 'jamal@hartfordlandscaping.com', firstName: 'Jamal', lastName: 'Brooks', phone: '(860) 555-2003', role: Role.FIELD_WORKER, isActive: true, passwordHash: pw },
  })

  const priya = await prisma.user.upsert({
    where: { email: 'priya@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-priya', email: 'priya@hartfordlandscaping.com', firstName: 'Priya', lastName: 'Nair', phone: '(860) 555-2004', role: Role.SUBCONTRACTOR, isActive: true, passwordHash: pw },
  })

  const connor = await prisma.user.upsert({
    where: { email: 'connor@hartfordlandscaping.com' },
    update: { passwordHash: pw },
    create: { id: 'user-connor', email: 'connor@hartfordlandscaping.com', firstName: 'Connor', lastName: 'Walsh', phone: '(860) 555-2005', role: Role.FIELD_WORKER, isActive: true, passwordHash: pw },
  })

  console.log('✅ Staff users created (10)')

  // ── Crews ─────────────────────────────────────────────────────────────────
  const crewAlpha = await prisma.crew.upsert({
    where: { id: 'crew-alpha' },
    update: {},
    create: { id: 'crew-alpha', name: 'Crew Alpha', leadWorkerId: benedict.id, isActive: true },
  })

  const crewBeta = await prisma.crew.upsert({
    where: { id: 'crew-beta' },
    update: {},
    create: { id: 'crew-beta', name: 'Crew Beta', leadWorkerId: marcus.id, isActive: true },
  })

  // ── Worker Profiles ───────────────────────────────────────────────────────
  for (const [userId, rate, pay, crew] of [
    [benedict.id, 75, PayType.SALARY, crewAlpha.id],
    [alex.id, 75, PayType.SALARY, crewAlpha.id],
    [marcus.id, 32, PayType.HOURLY, crewBeta.id],
    [darius.id, 22, PayType.HOURLY, crewAlpha.id],
    [elena.id, 20, PayType.HOURLY, crewAlpha.id],
    [jamal.id, 21, PayType.HOURLY, crewBeta.id],
    [priya.id, 55, PayType.SUBCONTRACT, crewBeta.id],
    [connor.id, 19, PayType.HOURLY, crewBeta.id],
  ] as [string, number, PayType, string][]) {
    await prisma.workerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, hourlyRate: rate, payType: pay, crewId: crew, isActive: true },
    })
  }
  console.log('✅ Worker profiles created')

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const suppGreen = await prisma.supplier.upsert({
    where: { id: 'supplier-greenworld' },
    update: {},
    create: { id: 'supplier-greenworld', name: 'GreenWorld Supply Co.', accountNumber: 'GWS-10042', repName: 'Maria Santos', repPhone: '(860) 555-3001', repEmail: 'maria@greenworldsupply.com', isActive: true },
  })

  const suppStone = await prisma.supplier.upsert({
    where: { id: 'supplier-hartford-stone' },
    update: {},
    create: { id: 'supplier-hartford-stone', name: 'Hartford Stone & Masonry', accountNumber: 'HSM-2241', repName: 'Tom Kowalski', repPhone: '(860) 555-3002', repEmail: 'tom@hartfordstone.com', isActive: true },
  })

  const suppNursery = await prisma.supplier.upsert({
    where: { id: 'supplier-ne-nursery' },
    update: {},
    create: { id: 'supplier-ne-nursery', name: 'Northeast Plant Nursery', accountNumber: 'NPN-0088', repName: 'Grace Huang', repPhone: '(860) 555-3003', repEmail: 'grace@nenursery.com', isActive: true },
  })

  const suppPrograde = await prisma.supplier.upsert({
    where: { id: 'supplier-prograde' },
    update: {},
    create: { id: 'supplier-prograde', name: 'ProGrade Landscape Supply', accountNumber: 'PGL-5510', repName: 'Derek Walsh', repPhone: '(860) 555-3004', repEmail: 'derek@prograde.com', isActive: true },
  })

  const suppSunbelt = await prisma.supplier.upsert({
    where: { id: 'supplier-sunbelt' },
    update: {},
    create: { id: 'supplier-sunbelt', name: 'SunBelt Irrigation & Lighting', accountNumber: 'SBI-9934', repName: 'Linda Park', repPhone: '(860) 555-3005', repEmail: 'linda@sunbeltirrigation.com', isActive: true },
  })

  console.log('✅ Suppliers created (5)')

  // ── Price Lists ───────────────────────────────────────────────────────────
  const plGreen = await prisma.priceList.upsert({
    where: { id: 'pl-greenworld-2025' },
    update: {},
    create: { id: 'pl-greenworld-2025', supplierId: suppGreen.id, name: 'Spring 2025 Price List', effectiveDate: new Date('2025-03-01'), isActive: true, uploadedByUserId: benedict.id },
  })

  const plStone = await prisma.priceList.upsert({
    where: { id: 'pl-stone-2025' },
    update: {},
    create: { id: 'pl-stone-2025', supplierId: suppStone.id, name: '2025 Hardscape Catalog', effectiveDate: new Date('2025-01-15'), isActive: true, uploadedByUserId: benedict.id },
  })

  const plNursery = await prisma.priceList.upsert({
    where: { id: 'pl-nursery-2025' },
    update: {},
    create: { id: 'pl-nursery-2025', supplierId: suppNursery.id, name: 'Spring/Summer 2025 Plant List', effectiveDate: new Date('2025-04-01'), isActive: true, uploadedByUserId: sandra.id },
  })

  const plPrograde = await prisma.priceList.upsert({
    where: { id: 'pl-prograde-2025' },
    update: {},
    create: { id: 'pl-prograde-2025', supplierId: suppPrograde.id, name: '2025 Supply Catalog', effectiveDate: new Date('2025-02-01'), isActive: true, uploadedByUserId: benedict.id },
  })

  const plSunbelt = await prisma.priceList.upsert({
    where: { id: 'pl-sunbelt-2025' },
    update: {},
    create: { id: 'pl-sunbelt-2025', supplierId: suppSunbelt.id, name: '2025 Irrigation & Lighting Catalog', effectiveDate: new Date('2025-01-01'), isActive: true, uploadedByUserId: benedict.id },
  })

  // ── SKUs — GreenWorld (25) ────────────────────────────────────────────────
  const gwSkus = [
    { id: 'sku-gw-001', item: 'GWS-MLH-001', name: 'Premium Hardwood Mulch', desc: 'Double-shredded hardwood mulch, 2 cu ft bag', uom: 'bag', price: 8.50, margin: 40 },
    { id: 'sku-gw-002', item: 'GWS-MLH-002', name: 'Cedar Mulch', desc: 'Natural cedar mulch, 2 cu ft bag', uom: 'bag', price: 9.25, margin: 38 },
    { id: 'sku-gw-003', item: 'GWS-MLH-003', name: 'Black Dyed Mulch', desc: 'Carbon-based dyed mulch, 2 cu ft bag', uom: 'bag', price: 7.99, margin: 40 },
    { id: 'sku-gw-004', item: 'GWS-MLH-004', name: 'Pine Straw Bale', desc: 'Long-leaf pine straw, large bale ~40 sq ft coverage', uom: 'bale', price: 6.75, margin: 35 },
    { id: 'sku-gw-005', item: 'GWS-MLH-005', name: 'Cocoa Bean Mulch', desc: 'Premium cocoa bean shell mulch, 2 cu ft bag', uom: 'bag', price: 11.50, margin: 42 },
    { id: 'sku-gw-006', item: 'GWS-SOL-001', name: 'Premium Topsoil', desc: 'Screened and blended topsoil, bulk delivery', uom: 'cubic yard', price: 45.00, margin: 35 },
    { id: 'sku-gw-007', item: 'GWS-SOL-002', name: 'Garden Blend Mix', desc: 'Topsoil, compost and sand blend', uom: 'cubic yard', price: 55.00, margin: 35 },
    { id: 'sku-gw-008', item: 'GWS-SOL-003', name: 'Compost/Humus', desc: 'Aged compost, screened, ideal amendment', uom: 'cubic yard', price: 48.00, margin: 38 },
    { id: 'sku-gw-009', item: 'GWS-SOL-004', name: 'Sandy Loam', desc: 'Sandy loam for drainage improvement', uom: 'cubic yard', price: 38.00, margin: 30 },
    { id: 'sku-gw-010', item: 'GWS-SOL-005', name: 'Peat Moss', desc: 'Canadian peat moss, 3.8 cu ft compressed bale', uom: 'bale', price: 19.99, margin: 35 },
    { id: 'sku-gw-011', item: 'GWS-AGG-001', name: 'Pea Gravel', desc: '3/8" natural pea gravel, bulk', uom: 'ton', price: 42.00, margin: 40 },
    { id: 'sku-gw-012', item: 'GWS-AGG-002', name: 'River Rock 1-2"', desc: 'Smooth river rock, 1-2" diameter', uom: 'ton', price: 58.00, margin: 40 },
    { id: 'sku-gw-013', item: 'GWS-AGG-003', name: 'Crushed Granite', desc: 'Grey crushed granite, 3/4" minus', uom: 'ton', price: 35.00, margin: 38 },
    { id: 'sku-gw-014', item: 'GWS-AGG-004', name: 'Lava Rock', desc: 'Red/black lava rock, 0.5 cu ft bag', uom: 'bag', price: 12.50, margin: 42 },
    { id: 'sku-gw-015', item: 'GWS-AGG-005', name: 'Decomposed Granite', desc: 'Natural decomposed granite fines', uom: 'ton', price: 40.00, margin: 38 },
    { id: 'sku-gw-016', item: 'GWS-SOD-001', name: 'Bermuda Sod', desc: 'Premium Bermuda grass sod, pallet 450 sq ft', uom: 'sq ft', price: 0.65, margin: 45 },
    { id: 'sku-gw-017', item: 'GWS-SOD-002', name: 'Zoysia Sod', desc: 'Zeon Zoysia sod, pallet 450 sq ft', uom: 'sq ft', price: 0.85, margin: 45 },
    { id: 'sku-gw-018', item: 'GWS-SOD-003', name: 'Tall Fescue Sod', desc: 'Turf-type tall fescue sod', uom: 'sq ft', price: 0.55, margin: 40 },
    { id: 'sku-gw-019', item: 'GWS-SOD-004', name: 'St. Augustine Sod', desc: 'Floratam St. Augustine sod', uom: 'sq ft', price: 0.72, margin: 42 },
    { id: 'sku-gw-020', item: 'GWS-SEED-001', name: 'Sun & Shade Grass Seed', desc: 'Premium blend for sun and partial shade', uom: 'lb', price: 7.50, margin: 35 },
    { id: 'sku-gw-021', item: 'GWS-SEED-002', name: 'Full Sun Grass Seed', desc: 'High-performance full sun blend', uom: 'lb', price: 8.25, margin: 35 },
    { id: 'sku-gw-022', item: 'GWS-SEED-003', name: 'Overseeding Mix', desc: 'Quick-establish overseeding blend', uom: 'lb', price: 6.99, margin: 35 },
    { id: 'sku-gw-023', item: 'GWS-WC-001', name: 'Landscape Fabric', desc: 'Pro-grade woven landscape fabric, 3x50ft roll', uom: 'roll', price: 24.99, margin: 40 },
    { id: 'sku-gw-024', item: 'GWS-WC-002', name: 'Straw Erosion Blanket', desc: 'Biodegradable straw erosion blanket, 4x112.5 sq yd', uom: 'roll', price: 38.00, margin: 35 },
    { id: 'sku-gw-025', item: 'GWS-WC-003', name: 'Pre-emergent Granular', desc: 'Season-long pre-emergent weed control', uom: 'lb', price: 4.25, margin: 45 },
  ]

  for (const s of gwSkus) {
    await prisma.sku.upsert({
      where: { id: s.id },
      update: {},
      create: { id: s.id, priceListId: plGreen.id, supplierId: suppGreen.id, supplierItemNumber: s.item, name: s.name, description: s.desc, unitOfMeasure: s.uom, basePrice: s.price, globalMarginPct: s.margin, isActive: true },
    })
  }

  // Bulk tiers for mulch and sod
  for (const [id, skuId, minQty, unitPrice] of [
    ['tier-gw-mulch-10', 'sku-gw-001', 10, 7.75],
    ['tier-gw-mulch-25', 'sku-gw-001', 25, 6.99],
    ['tier-gw-sod-500', 'sku-gw-016', 500, 0.58],
    ['tier-gw-sod-1500', 'sku-gw-016', 1500, 0.52],
    ['tier-gw-topsoil-5', 'sku-gw-006', 5, 41.00],
    ['tier-gw-topsoil-10', 'sku-gw-006', 10, 37.00],
  ] as [string, string, number, number][]) {
    await prisma.skuBulkPricingTier.upsert({ where: { id }, update: {}, create: { id, skuId, minQuantity: minQty, pricePerUnit: unitPrice } })
  }

  // ── SKUs — Hartford Stone (20) ────────────────────────────────────────────
  const stoneSkus = [
    { id: 'sku-hs-001', item: 'HSM-PAV-001', name: 'Concrete Paver 12x12', desc: 'Standard 12"x12" concrete paver, 2" thick', uom: 'each', price: 2.85, margin: 40 },
    { id: 'sku-hs-002', item: 'HSM-PAV-002', name: 'Tumbled Paver 6x9', desc: 'Tumbled finish 6"x9" paver, aged look', uom: 'each', price: 1.95, margin: 40 },
    { id: 'sku-hs-003', item: 'HSM-PAV-003', name: 'Brussels Block Paver', desc: 'European-style Brussels block, sold per sq ft', uom: 'sq ft', price: 6.50, margin: 42 },
    { id: 'sku-hs-004', item: 'HSM-PAV-004', name: 'Cobblestone Paver', desc: 'Tumbled granite cobblestone, 4x4"', uom: 'each', price: 3.25, margin: 38 },
    { id: 'sku-hs-005', item: 'HSM-PAV-005', name: 'Flagstone Natural', desc: 'Random irregular flagstone, 1.5" avg thick', uom: 'sq ft', price: 8.75, margin: 40 },
    { id: 'sku-hs-006', item: 'HSM-RW-001', name: 'Retaining Wall Block', desc: 'Standard 12"x7"x4" wall block, ~28 lbs', uom: 'each', price: 3.45, margin: 38 },
    { id: 'sku-hs-007', item: 'HSM-RW-002', name: 'Wall Cap Block', desc: 'Flat cap for retaining wall, 12"x6"x2.25"', uom: 'each', price: 2.95, margin: 38 },
    { id: 'sku-hs-008', item: 'HSM-RW-003', name: 'Corner Block', desc: '90-degree corner unit for wall system', uom: 'each', price: 4.25, margin: 38 },
    { id: 'sku-hs-009', item: 'HSM-RW-004', name: 'Wall Steps', desc: 'Pre-cast wall step unit, 48" wide', uom: 'linear ft', price: 32.00, margin: 35 },
    { id: 'sku-hs-010', item: 'HSM-RW-005', name: 'Pillar Block Cap', desc: 'Decorative pillar/column cap block', uom: 'each', price: 18.50, margin: 40 },
    { id: 'sku-hs-011', item: 'HSM-NS-001', name: 'Natural Fieldstone', desc: 'Connecticut fieldstone, irregular shapes', uom: 'ton', price: 175.00, margin: 35 },
    { id: 'sku-hs-012', item: 'HSM-NS-002', name: 'Slate Steps', desc: 'Natural slate step units, 6" rise x 12" tread', uom: 'linear ft', price: 45.00, margin: 38 },
    { id: 'sku-hs-013', item: 'HSM-NS-003', name: 'Bluestone Irregular', desc: 'PA bluestone irregular, 1.5" thick', uom: 'sq ft', price: 12.50, margin: 40 },
    { id: 'sku-hs-014', item: 'HSM-NS-004', name: 'Granite Boulder Small', desc: 'Natural granite accent boulder, 100-200 lbs', uom: 'each', price: 85.00, margin: 35 },
    { id: 'sku-hs-015', item: 'HSM-NS-005', name: 'Granite Boulder Large', desc: 'Natural granite focal boulder, 400-600 lbs', uom: 'each', price: 225.00, margin: 35 },
    { id: 'sku-hs-016', item: 'HSM-EDG-001', name: 'Steel Landscape Edging 8ft', desc: '3/16"x4" powder-coated steel edging, 8ft stick', uom: 'each', price: 14.99, margin: 40 },
    { id: 'sku-hs-017', item: 'HSM-EDG-002', name: 'Aluminum Flex Edging 16ft', desc: 'Heavy-duty aluminum flex edging, 16ft roll', uom: 'each', price: 22.50, margin: 40 },
    { id: 'sku-hs-018', item: 'HSM-EDG-003', name: 'Concrete Edging Block', desc: 'Decorative concrete border block, 6"x6"x3.5"', uom: 'each', price: 1.45, margin: 42 },
    { id: 'sku-hs-019', item: 'HSM-EDG-004', name: 'Decorative Brick Edge', desc: 'Red clay brick for edging, set on angle', uom: 'each', price: 0.85, margin: 45 },
    { id: 'sku-hs-020', item: 'HSM-EDG-005', name: 'Black Rubber Edging Roll', desc: 'Recycled rubber edging, 4"x20ft roll', uom: 'each', price: 18.99, margin: 38 },
  ]

  for (const s of stoneSkus) {
    await prisma.sku.upsert({
      where: { id: s.id },
      update: {},
      create: { id: s.id, priceListId: plStone.id, supplierId: suppStone.id, supplierItemNumber: s.item, name: s.name, description: s.desc, unitOfMeasure: s.uom, basePrice: s.price, globalMarginPct: s.margin, isActive: true },
    })
  }

  // ── SKUs — Northeast Plant Nursery (25) ───────────────────────────────────
  const nurserySkus = [
    { id: 'sku-np-001', item: 'NPN-TRE-001', name: 'Red Maple 2" Caliper', desc: 'Acer rubrum, 2" caliper, B&B', uom: 'each', price: 185.00, margin: 35 },
    { id: 'sku-np-002', item: 'NPN-TRE-002', name: 'Sugar Maple 2" Caliper', desc: 'Acer saccharum, 2" caliper, B&B', uom: 'each', price: 195.00, margin: 35 },
    { id: 'sku-np-003', item: 'NPN-TRE-003', name: 'River Birch Clump 6-8ft', desc: 'Betula nigra multi-stem, 6-8ft ht, B&B', uom: 'each', price: 145.00, margin: 38 },
    { id: 'sku-np-004', item: 'NPN-TRE-004', name: 'Pink Crabapple 1.5" Cal', desc: 'Malus spp., 1.5" caliper, B&B', uom: 'each', price: 120.00, margin: 38 },
    { id: 'sku-np-005', item: 'NPN-TRE-005', name: 'Flowering Dogwood 4-5ft', desc: 'Cornus florida, 4-5ft height, container', uom: 'each', price: 95.00, margin: 38 },
    { id: 'sku-np-006', item: 'NPN-SHR-001', name: 'Burning Bush 3gal', desc: 'Euonymus alatus, compact 3 gal', uom: 'each', price: 18.50, margin: 45 },
    { id: 'sku-np-007', item: 'NPN-SHR-002', name: 'Knockout Rose 3gal', desc: 'Rosa Knockout, double red, 3 gal', uom: 'each', price: 22.00, margin: 45 },
    { id: 'sku-np-008', item: 'NPN-SHR-003', name: 'Endless Summer Hydrangea 3gal', desc: 'Hydrangea macrophylla, reblooming, 3 gal', uom: 'each', price: 28.50, margin: 42 },
    { id: 'sku-np-009', item: 'NPN-SHR-004', name: 'Forsythia 3gal', desc: 'Forsythia x intermedia, 3 gal', uom: 'each', price: 16.00, margin: 42 },
    { id: 'sku-np-010', item: 'NPN-SHR-005', name: 'Snowball Viburnum 5gal', desc: 'Viburnum opulus, 5 gal', uom: 'each', price: 38.00, margin: 40 },
    { id: 'sku-np-011', item: 'NPN-EVG-001', name: 'Green Giant Arborvitae 4-5ft', desc: 'Thuja plicata, 4-5ft height, container', uom: 'each', price: 55.00, margin: 42 },
    { id: 'sku-np-012', item: 'NPN-EVG-002', name: 'Blue Holly 3gal', desc: 'Ilex x meserveae, 3 gal', uom: 'each', price: 24.50, margin: 42 },
    { id: 'sku-np-013', item: 'NPN-EVG-003', name: 'Boxwood 3gal', desc: 'Buxus sempervirens, 3 gal, 18" ht', uom: 'each', price: 29.00, margin: 42 },
    { id: 'sku-np-014', item: 'NPN-EVG-004', name: 'Skip Laurel 3gal', desc: 'Prunus laurocerasus Schipkaensis, 3 gal', uom: 'each', price: 22.00, margin: 42 },
    { id: 'sku-np-015', item: 'NPN-GRS-001', name: 'Karl Foerster Reed Grass 2gal', desc: 'Calamagrostis acutiflora, 2 gal', uom: 'each', price: 14.50, margin: 45 },
    { id: 'sku-np-016', item: 'NPN-GRS-002', name: 'Maiden Grass 3gal', desc: 'Miscanthus sinensis Gracillimus, 3 gal', uom: 'each', price: 18.00, margin: 45 },
    { id: 'sku-np-017', item: 'NPN-GRS-003', name: 'Blue Fescue 1gal', desc: 'Festuca glauca Elijah Blue, 1 gal', uom: 'each', price: 8.50, margin: 45 },
    { id: 'sku-np-018', item: 'NPN-GRS-004', name: 'Fountain Grass 3gal', desc: 'Pennisetum alopecuroides Hameln, 3 gal', uom: 'each', price: 16.50, margin: 45 },
    { id: 'sku-np-019', item: 'NPN-PER-001', name: 'Black-Eyed Susan 1gal', desc: 'Rudbeckia hirta, native perennial, 1 gal', uom: 'each', price: 7.25, margin: 48 },
    { id: 'sku-np-020', item: 'NPN-PER-002', name: 'Purple Coneflower 1gal', desc: 'Echinacea purpurea, native, 1 gal', uom: 'each', price: 7.25, margin: 48 },
    { id: 'sku-np-021', item: 'NPN-PER-003', name: 'Hosta Mix 1gal', desc: 'Mixed Hosta varieties, 1 gal', uom: 'each', price: 9.50, margin: 45 },
    { id: 'sku-np-022', item: 'NPN-PER-004', name: 'Daylily 1gal', desc: 'Hemerocallis mixed, 1 gal', uom: 'each', price: 8.00, margin: 45 },
    { id: 'sku-np-023', item: 'NPN-GC-001', name: 'Pachysandra Flat', desc: 'Pachysandra terminalis, 32-cell flat 4" pots', uom: 'flat', price: 42.00, margin: 45 },
    { id: 'sku-np-024', item: 'NPN-GC-002', name: 'Creeping Phlox Flat', desc: 'Phlox subulata mixed, 32-cell flat 4" pots', uom: 'flat', price: 46.00, margin: 45 },
    { id: 'sku-np-025', item: 'NPN-GC-003', name: 'Liriope 1gal', desc: 'Liriope muscari Big Blue, 1 gal', uom: 'each', price: 8.75, margin: 45 },
  ]

  for (const s of nurserySkus) {
    await prisma.sku.upsert({
      where: { id: s.id },
      update: {},
      create: { id: s.id, priceListId: plNursery.id, supplierId: suppNursery.id, supplierItemNumber: s.item, name: s.name, description: s.desc, unitOfMeasure: s.uom, basePrice: s.price, globalMarginPct: s.margin, isActive: true },
    })
  }

  // ── SKUs — ProGrade Landscape Supply (18) ─────────────────────────────────
  const progradeSkus = [
    { id: 'sku-pg-001', item: 'PGL-DR-001', name: 'Perforated Drain Pipe 4" 10ft', desc: '4" corrugated perforated drain pipe, 10ft section', uom: 'each', price: 7.50, margin: 38 },
    { id: 'sku-pg-002', item: 'PGL-DR-002', name: 'Solid Drain Pipe 4" 10ft', desc: '4" solid corrugated drain pipe, 10ft section', uom: 'each', price: 6.75, margin: 38 },
    { id: 'sku-pg-003', item: 'PGL-DR-003', name: 'Catch Basin 12x12', desc: '12"x12" plastic catch basin with grate', uom: 'each', price: 22.50, margin: 40 },
    { id: 'sku-pg-004', item: 'PGL-DR-004', name: 'Drain Grate Square 6"', desc: '6" square cast iron drain grate', uom: 'each', price: 14.00, margin: 40 },
    { id: 'sku-pg-005', item: 'PGL-DR-005', name: 'Filter Fabric 3x50ft', desc: 'Non-woven geotextile filter fabric roll', uom: 'roll', price: 32.00, margin: 35 },
    { id: 'sku-pg-006', item: 'PGL-DR-006', name: 'Drain Pipe Elbow 4"', desc: '4" corrugated elbow connector, 90-degree', uom: 'each', price: 3.25, margin: 40 },
    { id: 'sku-pg-007', item: 'PGL-ER-001', name: 'Silt Fence 3x100ft', desc: 'PP woven silt fence with stakes, 100ft roll', uom: 'roll', price: 48.00, margin: 35 },
    { id: 'sku-pg-008', item: 'PGL-ER-002', name: 'Straw Wattle 9" 25ft', desc: '9" diameter biodegradable straw wattle', uom: 'each', price: 28.00, margin: 38 },
    { id: 'sku-pg-009', item: 'PGL-ER-003', name: 'Biodegradable Netting Roll', desc: 'Jute erosion control netting, 4x225ft', uom: 'roll', price: 75.00, margin: 35 },
    { id: 'sku-pg-010', item: 'PGL-ER-004', name: 'Rip Rap Stone Mix', desc: 'Angular rip rap for slope/channel stabilization', uom: 'ton', price: 62.00, margin: 35 },
    { id: 'sku-pg-011', item: 'PGL-MS-001', name: 'Landscape Staples 6" Box', desc: '6" galvanized sod/fabric staples, box of 100', uom: 'box', price: 12.99, margin: 40 },
    { id: 'sku-pg-012', item: 'PGL-MS-002', name: 'Poly Edging Stakes Bag', desc: 'Black poly edging anchor stakes, bag of 50', uom: 'bag', price: 8.50, margin: 40 },
    { id: 'sku-pg-013', item: 'PGL-MS-003', name: 'Tree Stake Kit 2-Stake', desc: '2-stake kit with straps and hardware, up to 2" cal', uom: 'set', price: 18.50, margin: 42 },
    { id: 'sku-pg-014', item: 'PGL-MS-004', name: 'Tree Tie Strap', desc: 'Rubber tree tie, 1" wide x 18"', uom: 'each', price: 1.25, margin: 45 },
    { id: 'sku-pg-015', item: 'PGL-MS-005', name: 'Gopher Basket 5gal', desc: 'Galvanized wire gopher protection basket', uom: 'each', price: 4.50, margin: 45 },
    { id: 'sku-pg-016', item: 'PGL-MS-006', name: 'Deer Repellent Granular', desc: 'Season-long deer repellent, 5 lb shaker', uom: 'lb', price: 5.99, margin: 45 },
    { id: 'sku-pg-017', item: 'PGL-MS-007', name: 'Fertilizer Slow Release 50lb', desc: '15-5-10 slow release granular fertilizer', uom: 'bag', price: 42.00, margin: 38 },
    { id: 'sku-pg-018', item: 'PGL-MS-008', name: 'Mycorrhizal Root Booster', desc: 'Ecto/endo mycorrhizal transplant inoculant', uom: 'lb', price: 18.00, margin: 50 },
  ]

  for (const s of progradeSkus) {
    await prisma.sku.upsert({
      where: { id: s.id },
      update: {},
      create: { id: s.id, priceListId: plPrograde.id, supplierId: suppPrograde.id, supplierItemNumber: s.item, name: s.name, description: s.desc, unitOfMeasure: s.uom, basePrice: s.price, globalMarginPct: s.margin, isActive: true },
    })
  }

  // ── SKUs — SunBelt Irrigation & Lighting (17) ─────────────────────────────
  const sunbeltSkus = [
    { id: 'sku-sb-001', item: 'SBI-IRR-001', name: 'Pop-Up Spray Head 4"', desc: '4" pop-up spray head, 15ft radius', uom: 'each', price: 4.25, margin: 45 },
    { id: 'sku-sb-002', item: 'SBI-IRR-002', name: 'Rotor Sprinkler Head', desc: 'Gear-driven rotor, adjustable 40-360 degree', uom: 'each', price: 8.50, margin: 45 },
    { id: 'sku-sb-003', item: 'SBI-IRR-003', name: 'Valve Box Green Round', desc: '10" round plastic valve access box with lid', uom: 'each', price: 12.00, margin: 40 },
    { id: 'sku-sb-004', item: 'SBI-IRR-004', name: 'Anti-Siphon Valve 3/4"', desc: '3/4" anti-siphon zone control valve', uom: 'each', price: 18.50, margin: 42 },
    { id: 'sku-sb-005', item: 'SBI-IRR-005', name: 'Backflow Preventer 1"', desc: '1" reduced pressure zone backflow preventer', uom: 'each', price: 95.00, margin: 40 },
    { id: 'sku-sb-006', item: 'SBI-IRR-006', name: 'Smart Controller 6-Zone', desc: 'Wi-Fi smart irrigation controller, 6-zone indoor/outdoor', uom: 'each', price: 125.00, margin: 38 },
    { id: 'sku-sb-007', item: 'SBI-IRR-007', name: 'Smart Controller 12-Zone', desc: 'Wi-Fi smart irrigation controller, 12-zone', uom: 'each', price: 195.00, margin: 38 },
    { id: 'sku-sb-008', item: 'SBI-IRR-008', name: 'Drip Line 1/2" 100ft Roll', desc: '1/2" poly drip tubing, 100ft roll', uom: 'roll', price: 22.00, margin: 42 },
    { id: 'sku-sb-009', item: 'SBI-IRR-009', name: 'Drip Emitter 1gph', desc: '1 gallon-per-hour pressure-compensating emitter', uom: 'each', price: 0.65, margin: 50 },
    { id: 'sku-sb-010', item: 'SBI-LT-001', name: 'Path Light LED 12V', desc: '12V LED path/bollard light, 3W warm white', uom: 'each', price: 28.00, margin: 45 },
    { id: 'sku-sb-011', item: 'SBI-LT-002', name: 'Spot Light LED 12V', desc: '12V LED adjustable spotlight, 5W warm white', uom: 'each', price: 32.00, margin: 45 },
    { id: 'sku-sb-012', item: 'SBI-LT-003', name: 'Flood Light LED 12V', desc: '12V LED flood light, 10W wide beam', uom: 'each', price: 42.00, margin: 45 },
    { id: 'sku-sb-013', item: 'SBI-LT-004', name: 'Well Light LED In-Ground', desc: 'In-ground 12V well light, stainless face ring', uom: 'each', price: 55.00, margin: 42 },
    { id: 'sku-sb-014', item: 'SBI-LT-005', name: 'Low Voltage Transformer 150W', desc: '150W multi-tap landscape lighting transformer, timer', uom: 'each', price: 88.00, margin: 40 },
    { id: 'sku-sb-015', item: 'SBI-LT-006', name: 'Low Voltage Transformer 300W', desc: '300W smart landscape lighting transformer, app control', uom: 'each', price: 175.00, margin: 38 },
    { id: 'sku-sb-016', item: 'SBI-LT-007', name: 'Landscape Wire 12/2 100ft', desc: '12 AWG 2-conductor direct-burial landscape wire', uom: 'roll', price: 38.00, margin: 42 },
    { id: 'sku-sb-017', item: 'SBI-LT-008', name: 'Wire Connector Bag 25', desc: 'Waterproof wire gel-filled connectors, bag of 25', uom: 'bag', price: 14.99, margin: 45 },
  ]

  for (const s of sunbeltSkus) {
    await prisma.sku.upsert({
      where: { id: s.id },
      update: {},
      create: { id: s.id, priceListId: plSunbelt.id, supplierId: suppSunbelt.id, supplierItemNumber: s.item, name: s.name, description: s.desc, unitOfMeasure: s.uom, basePrice: s.price, globalMarginPct: s.margin, isActive: true },
    })
  }

  console.log('✅ SKUs created (105 across 5 suppliers)')

  // ════════════════════════════════════════════════════════════════════════════
  // PROJECT 1 — LEAD: Riverside Commons HOA (no quote yet)
  // ════════════════════════════════════════════════════════════════════════════
  const proj1 = await prisma.project.upsert({
    where: { id: 'proj-001' },
    update: {},
    create: {
      id: 'proj-001',
      name: 'Riverside Commons HOA — Common Areas Refresh',
      status: ProjectStatus.LEAD,
      projectType: ProjectType.HOA,
      siteAddress: { street: '500 Riverside Dr', city: 'Hartford', state: 'CT', zip: '06114', lat: 41.7530, lng: -72.6975 },
      estimatedHours: 80,
      projectManagerId: marcus.id,
      notes: 'HOA wants full common-area refresh: mulch beds, edging, seasonal color, new signage plantings. Budget TBD.',
      internalNotes: 'Large contract opportunity. HOA board meets 3rd Monday. Rep is Barbara Nguyen.',
    },
  })

  await prisma.customer.upsert({
    where: { id: 'cust-hoa-barbara' },
    update: {},
    create: { id: 'cust-hoa-barbara', projectId: proj1.id, firstName: 'Barbara', lastName: 'Nguyen', email: 'barbara.nguyen@riversidecommons.org', phone: '(860) 555-4001', persona: CustomerPersona.HOA_REP, isPrimary: true, magicLinkToken: 'ml-hoa-barbara-2025', magicLinkExpiry: new Date('2026-12-31'), notes: 'Board president. Decision maker. Prefers email.' },
  })

  await prisma.customer.upsert({
    where: { id: 'cust-hoa-scott' },
    update: {},
    create: { id: 'cust-hoa-scott', projectId: proj1.id, firstName: 'Scott', lastName: 'Mercer', email: 'scott.mercer@riversidecommons.org', phone: '(860) 555-4002', persona: CustomerPersona.PROPERTY_MANAGER, isPrimary: false, magicLinkToken: 'ml-hoa-scott-2025', magicLinkExpiry: new Date('2026-12-31'), notes: 'Property manager, handles day-to-day. CC on all comms.' },
  })

  await prisma.task.upsert({
    where: { id: 'task-p1-001' },
    update: {},
    create: { id: 'task-p1-001', projectId: proj1.id, title: 'Site walkthrough with Barbara', status: TaskStatus.OPEN, dueDate: new Date('2026-04-01'), assignedToUserId: marcus.id },
  })
  await prisma.task.upsert({
    where: { id: 'task-p1-002' },
    update: {},
    create: { id: 'task-p1-002', projectId: proj1.id, title: 'Prepare initial quote for HOA board', status: TaskStatus.OPEN, dueDate: new Date('2026-04-07'), assignedToUserId: benedict.id },
  })

  console.log('✅ Project 1 created: LEAD — Riverside Commons HOA')

  // ════════════════════════════════════════════════════════════════════════════
  // PROJECT 2 — QUOTED: Martinez Residence Pool Surround (quote SENT)
  // ════════════════════════════════════════════════════════════════════════════
  const proj2 = await prisma.project.upsert({
    where: { id: 'proj-002' },
    update: {},
    create: {
      id: 'proj-002',
      name: 'Martinez Residence — Pool Surround & Patio',
      status: ProjectStatus.QUOTED,
      projectType: ProjectType.RESIDENTIAL,
      siteAddress: { street: '28 Foxcroft Lane', city: 'West Hartford', state: 'CT', zip: '06107', lat: 41.7575, lng: -72.7402 },
      startDate: new Date('2026-05-01'),
      estimatedEndDate: new Date('2026-05-10'),
      estimatedHours: 55,
      crewId: crewAlpha.id,
      projectManagerId: benedict.id,
      globalMarginOverride: 38,
      notes: 'Flagstone pool surround, pea gravel accent beds, Knockout roses along fence. Existing patio to remain.',
      internalNotes: 'Robert has a tight budget ceiling of ~$10k. Sarah wants extra plants — may need CO.',
    },
  })

  await prisma.customer.upsert({
    where: { id: 'cust-martinez-robert' },
    update: {},
    create: { id: 'cust-martinez-robert', projectId: proj2.id, firstName: 'Robert', lastName: 'Martinez', email: 'robert.martinez@example.com', phone: '(860) 555-5001', persona: CustomerPersona.HOMEOWNER, isPrimary: true, magicLinkToken: 'ml-martinez-robert-2025', magicLinkExpiry: new Date('2026-12-31'), notes: 'Primary decision maker. Prefers text.' },
  })

  await prisma.customer.upsert({
    where: { id: 'cust-martinez-sarah' },
    update: {},
    create: { id: 'cust-martinez-sarah', projectId: proj2.id, firstName: 'Sarah', lastName: 'Martinez', email: 'sarah.martinez@example.com', phone: '(860) 555-5002', persona: CustomerPersona.SPOUSE, isPrimary: false, magicLinkToken: 'ml-martinez-sarah-2025', magicLinkExpiry: new Date('2026-12-31'), notes: 'Has strong plant preferences. Wants color.' },
  })

  // Quote v1 SENT
  const q2 = await prisma.quote.upsert({
    where: { id: 'quote-p2-001' },
    update: {},
    create: {
      id: 'quote-p2-001',
      projectId: proj2.id,
      versionNumber: 1,
      status: QuoteStatus.SENT,
      sentAt: new Date('2026-03-10'),
      expiresAt: new Date('2026-04-10'),
      laborTotal: 2640.00,
      materialsTotal: 4872.50,
      taxTotal: 426.33,
      total: 7938.83,
      globalMarginPct: 38,
      notes: 'Price includes all materials, delivery, and installation. Existing pool equipment not disturbed.',
      termsAndConditions: '50% deposit required upon approval. Balance due within 15 days of completion. Hartford Landscaping is not responsible for damage to underground utilities not marked by CBYD.',
    },
  })

  // Line items for quote 2
  const q2Lines = [
    { id: 'qli-p2-001', quoteId: q2.id, skuId: 'sku-hs-005', desc: 'Flagstone Natural — Pool Surround (180 sq ft)', qty: 180, unitPrice: 8.75, laborPpu: 3.50, laborHpu: 0.15, lineTotal: 2205.00 },
    { id: 'qli-p2-002', quoteId: q2.id, skuId: 'sku-gw-011', desc: 'Pea Gravel — Accent Beds (2 tons)', qty: 2, unitPrice: 42.00, laborPpu: 85.00, laborHpu: 3.5, lineTotal: 254.00 },
    { id: 'qli-p2-003', quoteId: q2.id, skuId: 'sku-np-007', desc: 'Knockout Rose 3gal (12 plants)', qty: 12, unitPrice: 22.00, laborPpu: 18.00, laborHpu: 0.5, lineTotal: 480.00 },
    { id: 'qli-p2-004', quoteId: q2.id, skuId: 'sku-np-008', desc: 'Endless Summer Hydrangea 3gal (6 plants)', qty: 6, unitPrice: 28.50, laborPpu: 18.00, laborHpu: 0.5, lineTotal: 279.00 },
    { id: 'qli-p2-005', quoteId: q2.id, skuId: 'sku-gw-001', desc: 'Premium Hardwood Mulch (20 bags)', qty: 20, unitPrice: 8.50, laborPpu: 4.50, laborHpu: 0.1, lineTotal: 260.00 },
    { id: 'qli-p2-006', quoteId: q2.id, skuId: 'sku-gw-023', desc: 'Landscape Fabric (4 rolls)', qty: 4, unitPrice: 24.99, laborPpu: 12.00, laborHpu: 0.25, lineTotal: 147.96 },
    { id: 'qli-p2-007', quoteId: q2.id, skuId: 'sku-hs-016', desc: 'Steel Landscape Edging 8ft (10 sticks)', qty: 10, unitPrice: 14.99, laborPpu: 8.00, laborHpu: 0.2, lineTotal: 229.90 },
    { id: 'qli-p2-008', quoteId: q2.id, skuId: null, desc: 'Site prep, grading and cleanup', qty: 1, unitPrice: 0, laborPpu: 650.00, laborHpu: 8, lineTotal: 650.00 },
    { id: 'qli-p2-009', quoteId: q2.id, skuId: null, desc: 'Delivery and disposal', qty: 1, unitPrice: 195.00, laborPpu: 0, laborHpu: 0, lineTotal: 195.00 },
  ]

  await Promise.all(q2Lines.map((li, idx) =>
    prisma.quoteLineItem.upsert({
      where: { id: li.id },
      update: {},
      create: { id: li.id, quoteId: li.quoteId, skuId: li.skuId, description: li.desc, quantity: li.qty, unitPrice: li.unitPrice, laborPricePerUnit: li.laborPpu, laborHoursPerUnit: li.laborHpu, lineTotal: li.lineTotal, sortOrder: idx },
    })
  ))

  console.log('✅ Project 2 created: QUOTED — Martinez Residence')

  // ════════════════════════════════════════════════════════════════════════════
  // PROJECT 3 — IN_PROGRESS: Maple Ridge Builder (quote approved, crew on-site)
  // ════════════════════════════════════════════════════════════════════════════
  const proj3 = await prisma.project.upsert({
    where: { id: 'proj-003' },
    update: {},
    create: {
      id: 'proj-003',
      name: 'Maple Ridge Development — Lot 14 New Construction',
      status: ProjectStatus.IN_PROGRESS,
      projectType: ProjectType.BUILDER,
      siteAddress: { street: '14 Maple Ridge Circle', city: 'Glastonbury', state: 'CT', zip: '06033', lat: 41.7023, lng: -72.6070 },
      startDate: new Date('2026-03-10'),
      estimatedEndDate: new Date('2026-03-28'),
      estimatedHours: 120,
      crewId: crewAlpha.id,
      projectManagerId: benedict.id,
      notes: 'Full lot grading, sod, trees, and shrub plantings for builder punch-out.',
      internalNotes: 'Builder wants CO2 sod added per revised lot plan. Already approved verbally — send CO.',
    },
  })

  await prisma.customer.upsert({
    where: { id: 'cust-mapleridge-tom' },
    update: {},
    create: { id: 'cust-mapleridge-tom', projectId: proj3.id, firstName: 'Tom', lastName: 'Gallagher', email: 'tom.gallagher@mapleridgect.com', phone: '(860) 555-6001', persona: CustomerPersona.BUILDER, isPrimary: true, magicLinkToken: 'ml-mapleridge-tom-2025', magicLinkExpiry: new Date('2026-12-31'), notes: 'Project manager at Maple Ridge Development LLC. Approves work orders.' },
  })

  // Quote v1 APPROVED
  const q3 = await prisma.quote.upsert({
    where: { id: 'quote-p3-001' },
    update: {},
    create: {
      id: 'quote-p3-001',
      projectId: proj3.id,
      versionNumber: 1,
      status: QuoteStatus.APPROVED,
      sentAt: new Date('2026-02-20'),
      approvedAt: new Date('2026-02-25'),
      approvedByCustomerId: 'cust-mapleridge-tom',
      expiresAt: new Date('2026-03-20'),
      laborTotal: 4800.00,
      materialsTotal: 6945.00,
      taxTotal: 607.69,
      total: 12352.69,
      globalMarginPct: 35,
      notes: 'Price per Maple Ridge standard spec. Sod per final grading plan.',
      termsAndConditions: '30% deposit at mobilization. Balance net 30 from completion. Builder responsible for final grade prior to sod installation.',
    },
  })

  const q3Lines = [
    { id: 'qli-p3-001', skuId: 'sku-gw-018', desc: 'Tall Fescue Sod — Full Lot (3,200 sq ft)', qty: 3200, unitPrice: 0.55, laborPpu: 0.45, laborHpu: 0.008, lineTotal: 3200.00 },
    { id: 'qli-p3-002', skuId: 'sku-gw-006', desc: 'Premium Topsoil — 6 yards', qty: 6, unitPrice: 45.00, laborPpu: 65.00, laborHpu: 2.5, lineTotal: 660.00 },
    { id: 'qli-p3-003', skuId: 'sku-np-011', desc: 'Green Giant Arborvitae 4-5ft (8 plants)', qty: 8, unitPrice: 55.00, laborPpu: 45.00, laborHpu: 1.0, lineTotal: 800.00 },
    { id: 'qli-p3-004', skuId: 'sku-np-001', desc: 'Red Maple 2" Caliper (3 trees)', qty: 3, unitPrice: 185.00, laborPpu: 150.00, laborHpu: 3.5, lineTotal: 1005.00 },
    { id: 'qli-p3-005', skuId: 'sku-np-007', desc: 'Knockout Rose 3gal (16 plants)', qty: 16, unitPrice: 22.00, laborPpu: 18.00, laborHpu: 0.5, lineTotal: 640.00 },
    { id: 'qli-p3-006', skuId: 'sku-np-013', desc: 'Boxwood 3gal (12 plants)', qty: 12, unitPrice: 29.00, laborPpu: 22.00, laborHpu: 0.5, lineTotal: 612.00 },
    { id: 'qli-p3-007', skuId: 'sku-gw-001', desc: 'Premium Hardwood Mulch (30 bags)', qty: 30, unitPrice: 8.50, laborPpu: 4.50, laborHpu: 0.1, lineTotal: 390.00 },
    { id: 'qli-p3-008', skuId: 'sku-pg-017', desc: 'Slow Release Fertilizer — Starter (3 bags)', qty: 3, unitPrice: 42.00, laborPpu: 15.00, laborHpu: 0.3, lineTotal: 171.00 },
    { id: 'qli-p3-009', skuId: null, desc: 'Site prep, final grade, sod base prep', qty: 1, unitPrice: 0, laborPpu: 1200.00, laborHpu: 16, lineTotal: 1200.00 },
    { id: 'qli-p3-010', skuId: null, desc: 'Delivery, equipment, and mobilization', qty: 1, unitPrice: 350.00, laborPpu: 0, laborHpu: 0, lineTotal: 350.00 },
  ]

  await Promise.all(q3Lines.map((li, idx) =>
    prisma.quoteLineItem.upsert({
      where: { id: li.id },
      update: {},
      create: { id: li.id, quoteId: q3.id, skuId: li.skuId, description: li.desc, quantity: li.qty, unitPrice: li.unitPrice, laborPricePerUnit: li.laborPpu, laborHoursPerUnit: li.laborHpu, lineTotal: li.lineTotal, sortOrder: idx },
    })
  ))

  // Change Order — additional sod
  const co3 = await prisma.changeOrder.upsert({
    where: { id: 'co-p3-001' },
    update: {},
    create: { id: 'co-p3-001', projectId: proj3.id, quoteId: q3.id, versionNumber: 1, status: ChangeOrderStatus.APPROVED, description: 'Additional 500 sq ft sod per revised lot plan — side yard extension', total: 512.00, approvedAt: new Date('2026-03-12'), approvedByCustomerId: 'cust-mapleridge-tom' },
  })

  await prisma.quoteLineItem.upsert({
    where: { id: 'qli-co3-001' },
    update: {},
    create: { id: 'qli-co3-001', changeOrderId: co3.id, skuId: 'sku-gw-018', description: 'Additional Tall Fescue Sod — Side Yard (500 sq ft)', quantity: 500, unitPrice: 0.55, laborPricePerUnit: 0.45, laborHoursPerUnit: 0.008, lineTotal: 500.00, sortOrder: 0 },
  })
  await prisma.quoteLineItem.upsert({
    where: { id: 'qli-co3-002' },
    update: {},
    create: { id: 'qli-co3-002', changeOrderId: co3.id, skuId: null, description: 'Additional soil prep — side yard', quantity: 1, unitPrice: 12.00, laborPricePerUnit: 0, laborHoursPerUnit: 0, lineTotal: 12.00, sortOrder: 1 },
  })

  // Time logs for project 3
  const p3TimeLogs = [
    { id: 'tl-p3-001', userId: benedict.id, clockIn: new Date('2026-03-10T07:30:00'), clockOut: new Date('2026-03-10T16:30:00'), breakMins: 30, totalMins: 510 },
    { id: 'tl-p3-002', userId: darius.id, clockIn: new Date('2026-03-10T07:30:00'), clockOut: new Date('2026-03-10T16:30:00'), breakMins: 30, totalMins: 510 },
    { id: 'tl-p3-003', userId: elena.id, clockIn: new Date('2026-03-10T07:30:00'), clockOut: new Date('2026-03-10T16:30:00'), breakMins: 30, totalMins: 510 },
    { id: 'tl-p3-004', userId: benedict.id, clockIn: new Date('2026-03-11T07:30:00'), clockOut: new Date('2026-03-11T16:00:00'), breakMins: 30, totalMins: 480 },
    { id: 'tl-p3-005', userId: darius.id, clockIn: new Date('2026-03-11T07:30:00'), clockOut: new Date('2026-03-11T16:00:00'), breakMins: 30, totalMins: 480 },
    { id: 'tl-p3-006', userId: elena.id, clockIn: new Date('2026-03-11T07:30:00'), clockOut: new Date('2026-03-11T15:30:00'), breakMins: 30, totalMins: 450 },
    { id: 'tl-p3-007', userId: benedict.id, clockIn: new Date('2026-03-14T07:30:00'), clockOut: new Date('2026-03-14T17:00:00'), breakMins: 30, totalMins: 540 },
    { id: 'tl-p3-008', userId: jamal.id, clockIn: new Date('2026-03-14T08:00:00'), clockOut: new Date('2026-03-14T17:00:00'), breakMins: 30, totalMins: 510 },
  ]

  for (const tl of p3TimeLogs) {
    await prisma.timeLog.upsert({
      where: { id: tl.id },
      update: {},
      create: { id: tl.id, projectId: proj3.id, userId: tl.userId, crewId: crewAlpha.id, clockInAt: tl.clockIn, clockOutAt: tl.clockOut, breakMinutes: tl.breakMins, totalMinutes: tl.totalMins, approvedByUserId: benedict.id, approvedAt: new Date('2026-03-15') },
    })
  }

  // Receipts for project 3
  const rec3 = await prisma.receipt.upsert({
    where: { id: 'rec-p3-001' },
    update: {},
    create: { id: 'rec-p3-001', projectId: proj3.id, uploadedByUserId: darius.id, vendor: 'GreenWorld Supply Co.', receiptDate: new Date('2026-03-09'), totalAmount: 284.50, taxAmount: 24.89, deliveryFee: 45.00, status: ReceiptStatus.APPROVED, reviewedByUserId: benedict.id, reviewedAt: new Date('2026-03-10') },
  })

  await prisma.receiptLineItem.upsert({
    where: { id: 'rli-p3-001' },
    update: {},
    create: { id: 'rli-p3-001', receiptId: rec3.id, skuId: 'sku-gw-001', description: 'Premium Hardwood Mulch x 30 bags', quantity: 30, unitCost: 8.50, extendedCost: 255.00, amortizedTax: 22.31, amortizedDelivery: 40.45, totalCost: 317.76 },
  })
  await prisma.receiptLineItem.upsert({
    where: { id: 'rli-p3-002' },
    update: {},
    create: { id: 'rli-p3-002', receiptId: rec3.id, skuId: 'sku-pg-017', description: 'Slow Release Fertilizer x 3 bags', quantity: 3, unitCost: 42.00, extendedCost: 126.00, amortizedTax: 11.03, amortizedDelivery: 20.00, totalCost: 157.03 },
  })

  console.log('✅ Project 3 created: IN_PROGRESS — Maple Ridge Builder')

  // ════════════════════════════════════════════════════════════════════════════
  // PROJECT 4 — INVOICED: Chen Residence Front Yard (partial payment received)
  // ════════════════════════════════════════════════════════════════════════════
  const proj4 = await prisma.project.upsert({
    where: { id: 'proj-004' },
    update: {},
    create: {
      id: 'proj-004',
      name: 'Chen Residence — Front Yard Native Planting',
      status: ProjectStatus.INVOICED,
      projectType: ProjectType.RESIDENTIAL,
      siteAddress: { street: '77 Elm Street', city: 'Wethersfield', state: 'CT', zip: '06109', lat: 41.7140, lng: -72.6609 },
      startDate: new Date('2026-02-24'),
      estimatedEndDate: new Date('2026-02-28'),
      actualEndDate: new Date('2026-03-01'),
      estimatedHours: 32,
      crewId: crewBeta.id,
      projectManagerId: marcus.id,
      notes: 'Native perennial front yard, Red Maple focal tree, mulched beds with pre-emergent.',
      internalNotes: 'Final invoice sent 3/5. Deposit was paid by check. Final balance outstanding.',
    },
  })

  await prisma.customer.upsert({
    where: { id: 'cust-chen-wei' },
    update: {},
    create: { id: 'cust-chen-wei', projectId: proj4.id, firstName: 'Wei', lastName: 'Chen', email: 'wei.chen@example.com', phone: '(860) 555-7001', persona: CustomerPersona.HOMEOWNER, isPrimary: true, magicLinkToken: 'ml-chen-wei-2025', magicLinkExpiry: new Date('2026-12-31'), notes: 'Punctual, prefers email.' },
  })

  await prisma.customer.upsert({
    where: { id: 'cust-chen-mei' },
    update: {},
    create: { id: 'cust-chen-mei', projectId: proj4.id, firstName: 'Mei', lastName: 'Chen', email: 'mei.chen@example.com', phone: '(860) 555-7002', persona: CustomerPersona.SPOUSE, isPrimary: false, magicLinkToken: 'ml-chen-mei-2025', magicLinkExpiry: new Date('2026-12-31'), notes: 'Secondary contact.' },
  })

  // Quote v1 APPROVED
  const q4 = await prisma.quote.upsert({
    where: { id: 'quote-p4-001' },
    update: {},
    create: {
      id: 'quote-p4-001',
      projectId: proj4.id,
      versionNumber: 1,
      status: QuoteStatus.APPROVED,
      sentAt: new Date('2026-02-10'),
      approvedAt: new Date('2026-02-14'),
      approvedByCustomerId: 'cust-chen-wei',
      expiresAt: new Date('2026-03-10'),
      laborTotal: 1380.00,
      materialsTotal: 2418.50,
      taxTotal: 211.61,
      total: 4010.11,
      globalMarginPct: 35,
      notes: 'Native-focused planting plan. All plants carry 1-year replacement warranty.',
      termsAndConditions: '50% deposit required to schedule. Balance due within 15 days of completion.',
    },
  })

  const q4Lines = [
    { id: 'qli-p4-001', skuId: 'sku-np-001', desc: 'Red Maple 2" Caliper (1 tree)', qty: 1, unitPrice: 185.00, laborPpu: 150.00, laborHpu: 3.5, lineTotal: 335.00 },
    { id: 'qli-p4-002', skuId: 'sku-np-019', desc: 'Black-Eyed Susan 1gal (12 plants)', qty: 12, unitPrice: 7.25, laborPpu: 8.00, laborHpu: 0.25, lineTotal: 183.00 },
    { id: 'qli-p4-003', skuId: 'sku-np-020', desc: 'Purple Coneflower 1gal (12 plants)', qty: 12, unitPrice: 7.25, laborPpu: 8.00, laborHpu: 0.25, lineTotal: 183.00 },
    { id: 'qli-p4-004', skuId: 'sku-np-023', desc: 'Pachysandra Flat (4 flats)', qty: 4, unitPrice: 42.00, laborPpu: 65.00, laborHpu: 1.5, lineTotal: 428.00 },
    { id: 'qli-p4-005', skuId: 'sku-gw-001', desc: 'Premium Hardwood Mulch (15 bags)', qty: 15, unitPrice: 8.50, laborPpu: 4.50, laborHpu: 0.1, lineTotal: 195.00 },
    { id: 'qli-p4-006', skuId: 'sku-gw-007', desc: 'Garden Blend Mix (2 cubic yards)', qty: 2, unitPrice: 55.00, laborPpu: 55.00, laborHpu: 1.5, lineTotal: 220.00 },
    { id: 'qli-p4-007', skuId: 'sku-gw-025', desc: 'Pre-emergent Granular (5 lbs)', qty: 5, unitPrice: 4.25, laborPpu: 6.00, laborHpu: 0.15, lineTotal: 51.25 },
    { id: 'qli-p4-008', skuId: 'sku-hs-016', desc: 'Steel Landscape Edging 8ft (8 sticks)', qty: 8, unitPrice: 14.99, laborPpu: 8.00, laborHpu: 0.2, lineTotal: 183.92 },
    { id: 'qli-p4-009', skuId: null, desc: 'Site prep, bed excavation and cleanup', qty: 1, unitPrice: 0, laborPpu: 550.00, laborHpu: 7, lineTotal: 550.00 },
  ]

  await Promise.all(q4Lines.map((li, idx) =>
    prisma.quoteLineItem.upsert({
      where: { id: li.id },
      update: {},
      create: { id: li.id, quoteId: q4.id, skuId: li.skuId, description: li.desc, quantity: li.qty, unitPrice: li.unitPrice, laborPricePerUnit: li.laborPpu, laborHoursPerUnit: li.laborHpu, lineTotal: li.lineTotal, sortOrder: idx },
    })
  ))

  // Deposit Invoice — PAID
  const inv4deposit = await prisma.invoice.upsert({
    where: { id: 'inv-p4-dep' },
    update: {},
    create: {
      id: 'inv-p4-dep',
      projectId: proj4.id,
      quoteId: q4.id,
      invoiceNumber: 'INV-2026-0041',
      status: InvoiceStatus.PAID,
      type: InvoiceType.DEPOSIT,
      amountDue: 2005.06,
      amountPaid: 2005.06,
      taxRate: 0.0875,
      taxAmount: 105.81,
      total: 2005.06,
      dueDate: new Date('2026-02-21'),
      sentAt: new Date('2026-02-14'),
      paidAt: new Date('2026-02-19'),
      notes: '50% deposit to schedule.',
    },
  })

  await prisma.payment.upsert({
    where: { id: 'pay-p4-001' },
    update: {},
    create: { id: 'pay-p4-001', invoiceId: inv4deposit.id, amount: 2005.06, paymentMethod: PaymentMethod.CHECK, paidAt: new Date('2026-02-19'), referenceNumber: 'CHK-4482', notes: 'Deposit check cleared.' },
  })

  // Final Invoice — SENT (outstanding)
  await prisma.invoice.upsert({
    where: { id: 'inv-p4-final' },
    update: {},
    create: {
      id: 'inv-p4-final',
      projectId: proj4.id,
      quoteId: q4.id,
      invoiceNumber: 'INV-2026-0042',
      status: InvoiceStatus.SENT,
      type: InvoiceType.FINAL,
      amountDue: 2005.05,
      amountPaid: 0,
      taxRate: 0.0875,
      taxAmount: 105.80,
      total: 2005.05,
      dueDate: new Date('2026-03-20'),
      sentAt: new Date('2026-03-05'),
      notes: 'Final balance. Thank you for your business!',
    },
  })

  // Time logs for project 4
  for (const [id, userId, clockIn, clockOut, totalMins] of [
    ['tl-p4-001', marcus.id, new Date('2026-02-24T08:00:00'), new Date('2026-02-24T16:30:00'), 480],
    ['tl-p4-002', jamal.id, new Date('2026-02-24T08:00:00'), new Date('2026-02-24T16:30:00'), 480],
    ['tl-p4-003', connor.id, new Date('2026-02-24T08:00:00'), new Date('2026-02-24T16:30:00'), 480],
    ['tl-p4-004', marcus.id, new Date('2026-02-25T08:00:00'), new Date('2026-02-25T15:30:00'), 420],
    ['tl-p4-005', jamal.id, new Date('2026-02-25T08:00:00'), new Date('2026-02-25T15:30:00'), 420],
    ['tl-p4-006', marcus.id, new Date('2026-03-01T08:00:00'), new Date('2026-03-01T13:00:00'), 300],
  ] as [string, string, Date, Date, number][]) {
    await prisma.timeLog.upsert({
      where: { id },
      update: {},
      create: { id, projectId: proj4.id, userId, crewId: crewBeta.id, clockInAt: clockIn, clockOutAt: clockOut, breakMinutes: 30, totalMinutes: totalMins, approvedByUserId: marcus.id, approvedAt: new Date('2026-03-02') },
    })
  }

  // Receipt for project 4
  const rec4 = await prisma.receipt.upsert({
    where: { id: 'rec-p4-001' },
    update: {},
    create: { id: 'rec-p4-001', projectId: proj4.id, uploadedByUserId: marcus.id, vendor: 'Northeast Plant Nursery', receiptDate: new Date('2026-02-23'), totalAmount: 521.00, taxAmount: 45.59, deliveryFee: 65.00, status: ReceiptStatus.APPROVED, reviewedByUserId: sandra.id, reviewedAt: new Date('2026-02-26') },
  })

  for (const [id, skuId, desc, qty, unitCost, extCost, tax, del, total] of [
    ['rli-p4-001', 'sku-np-001', 'Red Maple 2" Cal x 1', 1, 185.00, 185.00, 16.19, 23.13, 224.32],
    ['rli-p4-002', 'sku-np-019', 'Black-Eyed Susan 1gal x 12', 12, 7.25, 87.00, 7.61, 10.88, 105.49],
    ['rli-p4-003', 'sku-np-020', 'Purple Coneflower 1gal x 12', 12, 7.25, 87.00, 7.61, 10.88, 105.49],
    ['rli-p4-004', 'sku-np-023', 'Pachysandra flat x 4', 4, 42.00, 168.00, 14.70, 21.00, 203.70],
  ] as [string, string, string, number, number, number, number, number, number][]) {
    await prisma.receiptLineItem.upsert({
      where: { id },
      update: {},
      create: { id, receiptId: rec4.id, skuId, description: desc, quantity: qty, unitCost, extendedCost: extCost, amortizedTax: tax, amortizedDelivery: del, totalCost: total },
    })
  }

  console.log('✅ Project 4 created: INVOICED — Chen Residence')

  // ════════════════════════════════════════════════════════════════════════════
  // PROJECT 5 — PAID: Westfield Office Park Seasonal Maintenance
  // ════════════════════════════════════════════════════════════════════════════
  const proj5 = await prisma.project.upsert({
    where: { id: 'proj-005' },
    update: {},
    create: {
      id: 'proj-005',
      name: 'Westfield Office Park — Spring Refresh & Irrigation Start-Up',
      status: ProjectStatus.PAID,
      projectType: ProjectType.COMMERCIAL,
      siteAddress: { street: '200 Westfield Business Park Dr', city: 'Rocky Hill', state: 'CT', zip: '06067', lat: 41.6603, lng: -72.6512 },
      startDate: new Date('2026-02-05'),
      estimatedEndDate: new Date('2026-02-12'),
      actualEndDate: new Date('2026-02-11'),
      estimatedHours: 48,
      crewId: crewBeta.id,
      projectManagerId: benedict.id,
      notes: 'Annual spring refresh: mulch all beds, replace winter-damaged shrubs, irrigation start-up and backflow test.',
      internalNotes: 'Recurring commercial client. Renews every spring. Raise price 3-5% next year.',
    },
  })

  await prisma.customer.upsert({
    where: { id: 'cust-westfield-diane' },
    update: {},
    create: { id: 'cust-westfield-diane', projectId: proj5.id, firstName: 'Diane', lastName: 'Okafor', email: 'diane.okafor@westfieldop.com', phone: '(860) 555-8001', persona: CustomerPersona.PROPERTY_MANAGER, isPrimary: true, magicLinkToken: 'ml-westfield-diane-2025', magicLinkExpiry: new Date('2026-12-31'), notes: 'Property manager. Net 30 terms. ACH preferred.' },
  })

  // Quote v1 APPROVED
  const q5 = await prisma.quote.upsert({
    where: { id: 'quote-p5-001' },
    update: {},
    create: {
      id: 'quote-p5-001',
      projectId: proj5.id,
      versionNumber: 1,
      status: QuoteStatus.APPROVED,
      sentAt: new Date('2026-01-20'),
      approvedAt: new Date('2026-01-24'),
      approvedByCustomerId: 'cust-westfield-diane',
      expiresAt: new Date('2026-02-20'),
      laborTotal: 2880.00,
      materialsTotal: 2890.00,
      taxTotal: 252.88,
      total: 6022.88,
      globalMarginPct: 35,
      notes: 'Annual spring pricing. Includes irrigation start-up and backflow test certificate.',
      termsAndConditions: 'Net 30. ACH payment preferred. Annual contract renewal.',
    },
  })

  const q5Lines = [
    { id: 'qli-p5-001', skuId: 'sku-gw-001', desc: 'Premium Hardwood Mulch — All Beds (50 bags)', qty: 50, unitPrice: 8.50, laborPpu: 4.50, laborHpu: 0.1, lineTotal: 650.00 },
    { id: 'qli-p5-002', skuId: 'sku-np-011', desc: 'Green Giant Arborvitae 4-5ft — Replacement (4 plants)', qty: 4, unitPrice: 55.00, laborPpu: 45.00, laborHpu: 1.0, lineTotal: 400.00 },
    { id: 'qli-p5-003', skuId: 'sku-np-007', desc: 'Knockout Rose 3gal — Replacement (8 plants)', qty: 8, unitPrice: 22.00, laborPpu: 18.00, laborHpu: 0.5, lineTotal: 320.00 },
    { id: 'qli-p5-004', skuId: 'sku-gw-025', desc: 'Pre-emergent Granular (15 lbs)', qty: 15, unitPrice: 4.25, laborPpu: 6.00, laborHpu: 0.15, lineTotal: 153.75 },
    { id: 'qli-p5-005', skuId: 'sku-pg-017', desc: 'Slow Release Fertilizer (5 bags)', qty: 5, unitPrice: 42.00, laborPpu: 10.00, laborHpu: 0.2, lineTotal: 260.00 },
    { id: 'qli-p5-006', skuId: 'sku-sb-002', desc: 'Rotor Head Replacement (6 heads)', qty: 6, unitPrice: 8.50, laborPpu: 22.00, laborHpu: 0.5, lineTotal: 183.00 },
    { id: 'qli-p5-007', skuId: 'sku-sb-005', desc: 'Backflow Preventer 1" (1 unit)', qty: 1, unitPrice: 95.00, laborPpu: 120.00, laborHpu: 2.0, lineTotal: 215.00 },
    { id: 'qli-p5-008', skuId: null, desc: 'Irrigation system start-up and pressure test', qty: 1, unitPrice: 0, laborPpu: 450.00, laborHpu: 5, lineTotal: 450.00 },
    { id: 'qli-p5-009', skuId: null, desc: 'Bed cleanup, edging, debris removal', qty: 1, unitPrice: 0, laborPpu: 780.00, laborHpu: 10, lineTotal: 780.00 },
    { id: 'qli-p5-010', skuId: null, desc: 'Delivery and materials handling', qty: 1, unitPrice: 185.00, laborPpu: 0, laborHpu: 0, lineTotal: 185.00 },
  ]

  await Promise.all(q5Lines.map((li, idx) =>
    prisma.quoteLineItem.upsert({
      where: { id: li.id },
      update: {},
      create: { id: li.id, quoteId: q5.id, skuId: li.skuId, description: li.desc, quantity: li.qty, unitPrice: li.unitPrice, laborPricePerUnit: li.laborPpu, laborHoursPerUnit: li.laborHpu, lineTotal: li.lineTotal, sortOrder: idx },
    })
  ))

  // Final Invoice — PAID
  const inv5 = await prisma.invoice.upsert({
    where: { id: 'inv-p5-final' },
    update: {},
    create: {
      id: 'inv-p5-final',
      projectId: proj5.id,
      quoteId: q5.id,
      invoiceNumber: 'INV-2026-0038',
      status: InvoiceStatus.PAID,
      type: InvoiceType.FINAL,
      amountDue: 6022.88,
      amountPaid: 6022.88,
      taxRate: 0.0875,
      taxAmount: 252.88,
      total: 6022.88,
      dueDate: new Date('2026-03-13'),
      sentAt: new Date('2026-02-12'),
      paidAt: new Date('2026-03-08'),
      notes: 'Net 30. Thank you for your continued business.',
    },
  })

  await prisma.payment.upsert({
    where: { id: 'pay-p5-001' },
    update: {},
    create: { id: 'pay-p5-001', invoiceId: inv5.id, amount: 6022.88, paymentMethod: PaymentMethod.ACH, paidAt: new Date('2026-03-08'), referenceNumber: 'ACH-WFP-0308', notes: 'ACH received — Westfield Office Park.' },
  })

  // Time logs for project 5
  for (const [id, userId, clockIn, clockOut, totalMins] of [
    ['tl-p5-001', benedict.id, new Date('2026-02-05T07:30:00'), new Date('2026-02-05T16:30:00'), 510],
    ['tl-p5-002', jamal.id, new Date('2026-02-05T07:30:00'), new Date('2026-02-05T16:30:00'), 510],
    ['tl-p5-003', priya.id, new Date('2026-02-05T08:00:00'), new Date('2026-02-05T17:00:00'), 510],
    ['tl-p5-004', benedict.id, new Date('2026-02-06T07:30:00'), new Date('2026-02-06T16:00:00'), 480],
    ['tl-p5-005', jamal.id, new Date('2026-02-06T07:30:00'), new Date('2026-02-06T16:00:00'), 480],
    ['tl-p5-006', priya.id, new Date('2026-02-06T08:00:00'), new Date('2026-02-06T16:00:00'), 450],
    ['tl-p5-007', connor.id, new Date('2026-02-10T07:30:00'), new Date('2026-02-10T14:00:00'), 360],
    ['tl-p5-008', benedict.id, new Date('2026-02-11T07:30:00'), new Date('2026-02-11T13:30:00'), 330],
  ] as [string, string, Date, Date, number][]) {
    await prisma.timeLog.upsert({
      where: { id },
      update: {},
      create: { id, projectId: proj5.id, userId, crewId: crewBeta.id, clockInAt: clockIn, clockOutAt: clockOut, breakMinutes: 30, totalMinutes: totalMins, approvedByUserId: benedict.id, approvedAt: new Date('2026-02-12') },
    })
  }

  // Receipt for project 5
  const rec5a = await prisma.receipt.upsert({
    where: { id: 'rec-p5-001' },
    update: {},
    create: { id: 'rec-p5-001', projectId: proj5.id, uploadedByUserId: jamal.id, vendor: 'GreenWorld Supply Co.', receiptDate: new Date('2026-02-04'), totalAmount: 524.50, taxAmount: 45.89, deliveryFee: 55.00, status: ReceiptStatus.APPROVED, reviewedByUserId: sandra.id, reviewedAt: new Date('2026-02-07') },
  })
  await prisma.receiptLineItem.upsert({
    where: { id: 'rli-p5-001' },
    update: {},
    create: { id: 'rli-p5-001', receiptId: rec5a.id, skuId: 'sku-gw-001', description: 'Premium Hardwood Mulch x 50 bags', quantity: 50, unitCost: 8.50, extendedCost: 425.00, amortizedTax: 37.19, amortizedDelivery: 44.58, totalCost: 506.77 },
  })
  await prisma.receiptLineItem.upsert({
    where: { id: 'rli-p5-002' },
    update: {},
    create: { id: 'rli-p5-002', receiptId: rec5a.id, skuId: 'sku-gw-025', description: 'Pre-emergent Granular x 15 lbs', quantity: 15, unitCost: 4.25, extendedCost: 63.75, amortizedTax: 5.58, amortizedDelivery: 6.69, totalCost: 76.02 },
  })

  const rec5b = await prisma.receipt.upsert({
    where: { id: 'rec-p5-002' },
    update: {},
    create: { id: 'rec-p5-002', projectId: proj5.id, uploadedByUserId: priya.id, vendor: 'SunBelt Irrigation & Lighting', receiptDate: new Date('2026-02-04'), totalAmount: 146.00, taxAmount: 12.78, deliveryFee: 0, status: ReceiptStatus.APPROVED, reviewedByUserId: sandra.id, reviewedAt: new Date('2026-02-07') },
  })
  await prisma.receiptLineItem.upsert({
    where: { id: 'rli-p5-003' },
    update: {},
    create: { id: 'rli-p5-003', receiptId: rec5b.id, skuId: 'sku-sb-002', description: 'Rotor Sprinkler Head x 6', quantity: 6, unitCost: 8.50, extendedCost: 51.00, amortizedTax: 4.46, amortizedDelivery: 0, totalCost: 55.46 },
  })
  await prisma.receiptLineItem.upsert({
    where: { id: 'rli-p5-004' },
    update: {},
    create: { id: 'rli-p5-004', receiptId: rec5b.id, skuId: 'sku-sb-005', description: 'Backflow Preventer 1" x 1', quantity: 1, unitCost: 95.00, extendedCost: 95.00, amortizedTax: 8.31, amortizedDelivery: 0, totalCost: 103.31 },
  })

  // Crew project assignments
  await prisma.crewProjectAssignment.upsert({
    where: { crewId_projectId: { crewId: crewAlpha.id, projectId: proj3.id } },
    update: {},
    create: { id: 'cpa-alpha-p3', crewId: crewAlpha.id, projectId: proj3.id, startDate: new Date('2026-03-10'), notes: 'Full installation crew' },
  })
  await prisma.crewProjectAssignment.upsert({
    where: { crewId_projectId: { crewId: crewBeta.id, projectId: proj4.id } },
    update: {},
    create: { id: 'cpa-beta-p4', crewId: crewBeta.id, projectId: proj4.id, startDate: new Date('2026-02-24'), endDate: new Date('2026-03-01'), notes: 'Completed' },
  })
  await prisma.crewProjectAssignment.upsert({
    where: { crewId_projectId: { crewId: crewBeta.id, projectId: proj5.id } },
    update: {},
    create: { id: 'cpa-beta-p5', crewId: crewBeta.id, projectId: proj5.id, startDate: new Date('2026-02-05'), endDate: new Date('2026-02-11'), notes: 'Completed' },
  })

  console.log('✅ Project 5 created: PAID — Westfield Office Park')

  console.log('\n🎉 Seed complete!')
  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│  STAFF LOGINS (password: devpassword)                            │
├──────────────────────────────────────────────────────────────────┤
│  benedict@hartfordlandscaping.com  OWNER                         │
│  alex@hartfordlandscaping.com      OWNER                         │
│  sandra@hartfordlandscaping.com    ACCOUNTANT                    │
│  marcus@hartfordlandscaping.com    PROJECT_MANAGER               │
│  admin@hartfordlandscaping.com     PLATFORM_ADMIN                │
│  darius@hartfordlandscaping.com    FIELD_WORKER                  │
│  elena@hartfordlandscaping.com     FIELD_WORKER                  │
│  jamal@hartfordlandscaping.com     FIELD_WORKER                  │
│  priya@hartfordlandscaping.com     SUBCONTRACTOR                 │
│  connor@hartfordlandscaping.com    FIELD_WORKER                  │
├──────────────────────────────────────────────────────────────────┤
│  CUSTOMER PORTAL TOKENS (no password — magic link)              │
├──────────────────────────────────────────────────────────────────┤
│  /portal/ml-hoa-barbara-2025       Barbara Nguyen (HOA)         │
│  /portal/ml-hoa-scott-2025         Scott Mercer (Prop Mgr)      │
│  /portal/ml-martinez-robert-2025   Robert Martinez              │
│  /portal/ml-martinez-sarah-2025    Sarah Martinez               │
│  /portal/ml-mapleridge-tom-2025    Tom Gallagher (Builder)      │
│  /portal/ml-chen-wei-2025          Wei Chen                     │
│  /portal/ml-chen-mei-2025          Mei Chen                     │
│  /portal/ml-westfield-diane-2025   Diane Okafor (Prop Mgr)      │
└──────────────────────────────────────────────────────────────────┘
`)
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
