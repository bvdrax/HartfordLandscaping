import { PrismaClient, Role, ProjectType, ProjectStatus, CustomerPersona, PayType } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Global Settings ──────────────────────────────────────────────────────────
  await prisma.globalSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      defaultMarginPct: 35,
      defaultTaxRate: 0.0875,
      companyName: 'Hartford Landscaping',
      companyPhone: '(555) 000-0000',
      companyEmail: 'info@hartfordlandscaping.com',
    },
  })
  console.log('✅ Global settings created')

  // ── Owner Users ──────────────────────────────────────────────────────────────
  // Dev seed always stores the hash so login works regardless of env file used
  const devPasswordHash = createHash('sha256').update('devpassword').digest('hex')

  const benedict = await prisma.user.upsert({
    where: { email: 'benedict@hartfordlandscaping.com' },
    update: { passwordHash: devPasswordHash },
    create: {
      email: 'benedict@hartfordlandscaping.com',
      firstName: 'Benedict',
      lastName: 'Varela',
      phone: '(555) 100-0001',
      role: Role.OWNER,
      isActive: true,
      passwordHash: devPasswordHash,
    },
  })

  const coOwner = await prisma.user.upsert({
    where: { email: 'partner@hartfordlandscaping.com' },
    update: { passwordHash: devPasswordHash },
    create: {
      email: 'partner@hartfordlandscaping.com',
      firstName: 'Alex',
      lastName: 'Varela',
      phone: '(555) 100-0002',
      role: Role.OWNER,
      isActive: true,
      passwordHash: devPasswordHash,
    },
  })
  console.log('✅ Owner users created:', benedict.email, coOwner.email)

  // ── Worker Profiles for owners ────────────────────────────────────────────────
  await prisma.workerProfile.upsert({
    where: { userId: benedict.id },
    update: {},
    create: {
      userId: benedict.id,
      hourlyRate: 75,
      payType: PayType.SALARY,
      isActive: true,
    },
  })

  await prisma.workerProfile.upsert({
    where: { userId: coOwner.id },
    update: {},
    create: {
      userId: coOwner.id,
      hourlyRate: 75,
      payType: PayType.SALARY,
      isActive: true,
    },
  })

  // ── Crew ─────────────────────────────────────────────────────────────────────
  const crew = await prisma.crew.upsert({
    where: { id: 'crew-alpha' },
    update: {},
    create: {
      id: 'crew-alpha',
      name: 'Crew Alpha',
      leadWorkerId: benedict.id,
      isActive: true,
    },
  })

  // Update worker profiles with crew assignment
  await prisma.workerProfile.update({
    where: { userId: benedict.id },
    data: { crewId: crew.id },
  })
  await prisma.workerProfile.update({
    where: { userId: coOwner.id },
    data: { crewId: crew.id },
  })
  console.log('✅ Crew created:', crew.name)

  // ── Supplier ──────────────────────────────────────────────────────────────────
  const supplier = await prisma.supplier.upsert({
    where: { id: 'supplier-greenworld' },
    update: {},
    create: {
      id: 'supplier-greenworld',
      name: 'GreenWorld Supply Co.',
      accountNumber: 'GWS-10042',
      repName: 'Maria Santos',
      repPhone: '(555) 200-1000',
      repEmail: 'maria@greenworldsupply.com',
      isActive: true,
    },
  })
  console.log('✅ Supplier created:', supplier.name)

  // ── Price List ────────────────────────────────────────────────────────────────
  const priceList = await prisma.priceList.upsert({
    where: { id: 'pl-2025-spring' },
    update: {},
    create: {
      id: 'pl-2025-spring',
      supplierId: supplier.id,
      name: 'Spring 2025 Price List',
      effectiveDate: new Date('2025-03-01'),
      isActive: true,
      uploadedByUserId: benedict.id,
    },
  })

  // ── SKUs ──────────────────────────────────────────────────────────────────────
  const sku1 = await prisma.sku.upsert({
    where: { id: 'sku-mulch-bag' },
    update: {},
    create: {
      id: 'sku-mulch-bag',
      priceListId: priceList.id,
      supplierId: supplier.id,
      supplierItemNumber: 'GWS-MLH-001',
      name: 'Premium Hardwood Mulch',
      description: '2 cubic foot bag of premium hardwood mulch, double-shredded',
      unitOfMeasure: 'bag',
      basePrice: 8.50,
      globalMarginPct: 40,
      isActive: true,
    },
  })

  // Add bulk pricing tier for mulch
  await prisma.skuBulkPricingTier.upsert({
    where: { id: 'tier-mulch-10' },
    update: {},
    create: {
      id: 'tier-mulch-10',
      skuId: sku1.id,
      minQuantity: 10,
      pricePerUnit: 7.75,
    },
  })
  await prisma.skuBulkPricingTier.upsert({
    where: { id: 'tier-mulch-25' },
    update: {},
    create: {
      id: 'tier-mulch-25',
      skuId: sku1.id,
      minQuantity: 25,
      pricePerUnit: 6.99,
    },
  })

  const sku2 = await prisma.sku.upsert({
    where: { id: 'sku-topsoil-yard' },
    update: {},
    create: {
      id: 'sku-topsoil-yard',
      priceListId: priceList.id,
      supplierId: supplier.id,
      supplierItemNumber: 'GWS-TOP-002',
      name: 'Premium Topsoil',
      description: 'Screened and blended premium topsoil',
      unitOfMeasure: 'cubic yard',
      basePrice: 45.00,
      globalMarginPct: 35,
      isActive: true,
    },
  })

  const sku3 = await prisma.sku.upsert({
    where: { id: 'sku-sod-sqft' },
    update: {},
    create: {
      id: 'sku-sod-sqft',
      priceListId: priceList.id,
      supplierId: supplier.id,
      supplierItemNumber: 'GWS-SOD-003',
      name: 'Bermuda Sod',
      description: 'Premium Bermuda grass sod, sold per square foot',
      unitOfMeasure: 'sq ft',
      basePrice: 0.65,
      globalMarginPct: 45,
      isActive: true,
    },
  })
  console.log('✅ SKUs created:', sku1.name, sku2.name, sku3.name)

  // ── Test Project ─────────────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'proj-test-001' },
    update: {},
    create: {
      id: 'proj-test-001',
      name: 'Johnson Residence — Backyard Renovation',
      status: ProjectStatus.QUOTED,
      projectType: ProjectType.RESIDENTIAL,
      siteAddress: {
        street: '142 Oakwood Drive',
        city: 'Hartford',
        state: 'CT',
        zip: '06103',
        lat: 41.7658,
        lng: -72.6851,
      },
      startDate: new Date('2025-04-15'),
      estimatedEndDate: new Date('2025-04-22'),
      estimatedHours: 40,
      crewId: crew.id,
      projectManagerId: benedict.id,
      globalMarginOverride: null,
      notes: 'Customer wants natural look with native plants. Drought-tolerant preferred.',
      internalNotes: 'Site has drainage issue near fence — assess during walkthrough.',
    },
  })

  // ── Test Customers ────────────────────────────────────────────────────────────
  await prisma.customer.upsert({
    where: { id: 'cust-johnson-primary' },
    update: {},
    create: {
      id: 'cust-johnson-primary',
      projectId: project.id,
      firstName: 'Robert',
      lastName: 'Johnson',
      email: 'robert.johnson@example.com',
      phone: '(555) 300-0101',
      persona: CustomerPersona.HOMEOWNER,
      isPrimary: true,
      notes: 'Preferred contact. Available evenings after 5pm.',
    },
  })

  await prisma.customer.upsert({
    where: { id: 'cust-johnson-secondary' },
    update: {},
    create: {
      id: 'cust-johnson-secondary',
      projectId: project.id,
      firstName: 'Linda',
      lastName: 'Johnson',
      email: 'linda.johnson@example.com',
      phone: '(555) 300-0102',
      persona: CustomerPersona.SPOUSE,
      isPrimary: false,
      notes: 'Has strong preferences on plant selection.',
    },
  })
  console.log('✅ Test project created:', project.name)
  console.log('✅ Test customers created: Robert & Linda Johnson')

  console.log('\n🎉 Seed complete!')
  console.log('\nLogin credentials (dev mode):')
  console.log('  Email: benedict@hartfordlandscaping.com')
  console.log('  Password: devpassword')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
