const { Client } = require('pg');
const { execSync } = require('child_process');

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');
  
  // Get the DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('📊 DATABASE_URL found:', databaseUrl);
  
  // Parse the connection string to get connection details
  const url = new URL(databaseUrl);
  const host = url.hostname;
  const port = url.port || 5432;
  const user = url.username;
  const password = url.password;
  const databaseName = url.pathname.substring(1); // Remove leading slash
  
  console.log('🔍 Connection details:', { host, port, user, databaseName });
  
  try {
    // Connect to the default 'postgres' database first
    const client = new Client({
      host,
      port,
      user,
      password,
      database: 'postgres', // Connect to default database
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Connected to postgres database');
    
    // Check if our target database exists
    const dbExistsResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName]
    );
    
    if (dbExistsResult.rows.length === 0) {
      console.log(`📝 Database '${databaseName}' does not exist, creating it...`);
      await client.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`✅ Database '${databaseName}' created successfully`);
    } else {
      console.log(`✅ Database '${databaseName}' already exists`);
    }
    
    await client.end();
    console.log('🔌 Disconnected from postgres database');
    
    // Now run Prisma migrations
    console.log('🔄 Running Prisma migrations...');
    try {
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Prisma migrations completed successfully');
    } catch (migrationError) {
      console.error('❌ Prisma migration failed:', migrationError.message);
      process.exit(1);
    }
    
    // Populate schools table
    console.log('🏫 Populating schools table...');
    try {
      await populateSchools();
      console.log('✅ Schools table populated successfully');
    } catch (schoolError) {
      console.error('⚠️ School population failed, but continuing:', schoolError.message);
    }
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

async function populateSchools() {
  try {
    // Use Prisma client instead of raw SQL
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Check if schools table has data
    const schoolCount = await prisma.school.count();
    
    if (schoolCount > 0) {
      console.log(`📚 Schools table already has ${schoolCount} schools, skipping population`);
    } else {
      console.log('📚 Schools table is empty, populating with default schools...');
      
      const schools = [
        {
          name: 'Harvard University',
          domain: 'harvard.edu',
          verificationMethods: ['email', 'id_card', 'transcript']
        },
        {
          name: 'Stanford University',
          domain: 'stanford.edu',
          verificationMethods: ['email', 'id_card', 'transcript']
        },
        {
          name: 'Massachusetts Institute of Technology',
          domain: 'mit.edu',
          verificationMethods: ['email', 'id_card', 'transcript']
        },
        {
          name: 'Yale University',
          domain: 'yale.edu',
          verificationMethods: ['email', 'id_card', 'transcript']
        },
        {
          name: 'Princeton University',
          domain: 'princeton.edu',
          verificationMethods: ['email', 'id_card', 'transcript']
        },
        {
          name: 'Columbia University',
          domain: 'columbia.edu',
          verificationMethods: ['email', 'id_card', 'transcript']
        },
        {
          name: 'University of California, Berkeley',
          domain: 'berkeley.edu',
          verificationMethods: ['email', 'id_card', 'transcript']
        },
        {
          name: 'University of Chicago',
          domain: 'uchicago.edu',
          verificationMethods: ['email', 'id_card', 'transcript']
        },
        {
          name: 'New York University',
          domain: 'nyu.edu',
          verificationMethods: ['email', 'id_card', 'transcript', 'document']
        },
        {
          name: 'University of Pennsylvania',
          domain: 'upenn.edu',
          verificationMethods: ['email', 'id_card', 'transcript']
        },
        {
          name: 'Test University',
          domain: 'test.edu',
          verificationMethods: ['email', 'id_card']
        }
      ];
      
      for (const school of schools) {
        await prisma.school.upsert({
          where: { name: school.name },
          update: {},
          create: school
        });
      }
      
      console.log(`✅ ${schools.length} schools created successfully`);
    }
    
    // Check if admin account exists
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      console.log(`👑 Admin account already exists, skipping creation`);
    } else {
      console.log('👑 Creating admin account...');
      
      // Import bcrypt for password hashing
      const bcryptModule = await import('bcryptjs');
      const bcrypt = bcryptModule.default;
      const passwordHash = await bcrypt.hash('AdminPassword123!', 12);
      
      await prisma.admin.create({
        data: {
          email: 'admin@village.com',
          passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'super_admin',
          verified: true,
          isActive: true
        }
      });
      
      console.log('✅ Admin account created successfully');
      console.log('📧 Email: admin@village.com');
      console.log('🔑 Password: AdminPassword123!');
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error populating schools and admin:', error);
    throw error;
  }
}

// Run the initialization
initializeDatabase();
