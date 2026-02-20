import 'reflect-metadata';
import * as repl from 'repl';
import { DataSource, Repository } from 'typeorm';
import { ProjectEntity, WorkflowEntity, AgentEntity } from './entities';

// Database connection
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'claude_cockpit',
  entities: [ProjectEntity, WorkflowEntity, AgentEntity],
  synchronize: false,
  logging: true, // Show SQL queries
});

interface ConsoleContext {
  db: DataSource;
  Project: Repository<ProjectEntity>;
  Workflow: Repository<WorkflowEntity>;
  Agent: Repository<AgentEntity>;
  ProjectEntity: typeof ProjectEntity;
  WorkflowEntity: typeof WorkflowEntity;
  AgentEntity: typeof AgentEntity;
}

async function startConsole(): Promise<void> {
  console.log('🚀 Connecting to database...');

  try {
    await dataSource.initialize();
    console.log('✅ Database connected!\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  // Create repositories
  const projectRepo = dataSource.getRepository(ProjectEntity);
  const workflowRepo = dataSource.getRepository(WorkflowEntity);
  const agentRepo = dataSource.getRepository(AgentEntity);

  console.log('📦 Available objects:');
  console.log('  db         - DataSource instance');
  console.log('  Project    - ProjectEntity repository');
  console.log('  Workflow   - WorkflowEntity repository');
  console.log('  Agent      - AgentEntity repository');
  console.log('');
  console.log('📝 Example usage:');
  console.log('  await Project.find()');
  console.log('  await Workflow.findOne({ where: { id: "xxx" } })');
  console.log('  await Agent.count()');
  console.log('  await db.query("SELECT * FROM projects")');
  console.log('');

  // Start REPL
  const replServer = repl.start({
    prompt: 'cockpit> ',
    useColors: true,
    useGlobal: true,
    ignoreUndefined: true,
  });

  // Add context
  const context: ConsoleContext = {
    db: dataSource,
    Project: projectRepo,
    Workflow: workflowRepo,
    Agent: agentRepo,
    ProjectEntity,
    WorkflowEntity,
    AgentEntity,
  };

  Object.assign(replServer.context, context);

  // Handle exit
  replServer.on('exit', async () => {
    console.log('\n👋 Closing database connection...');
    await dataSource.destroy();
    console.log('✅ Goodbye!');
    process.exit(0);
  });

  // Add custom commands
  replServer.defineCommand('tables', {
    help: 'List all tables',
    action: async function () {
      const tables = await dataSource.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      console.log('\n📋 Tables:');
      tables.forEach((t: { table_name: string }) => console.log(`  - ${t.table_name}`));
      console.log('');
      this.displayPrompt();
    },
  });

  replServer.defineCommand('desc', {
    help: 'Describe a table: .desc <table_name>',
    action: async function (tableName: string) {
      if (!tableName) {
        console.log('Usage: .desc <table_name>');
        this.displayPrompt();
        return;
      }
      const columns = await dataSource.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      if (columns.length === 0) {
        console.log(`Table "${tableName}" not found.`);
      } else {
        console.log(`\n📋 ${tableName}:`);
        columns.forEach((c: { column_name: string; data_type: string; is_nullable: string; column_default: string }) => {
          const nullable = c.is_nullable === 'YES' ? '?' : '';
          const defaultVal = c.column_default ? ` = ${c.column_default}` : '';
          console.log(`  ${c.column_name}${nullable}: ${c.data_type}${defaultVal}`);
        });
        console.log('');
      }
      this.displayPrompt();
    },
  });

  replServer.defineCommand('count', {
    help: 'Count records: .count <table_name>',
    action: async function (tableName: string) {
      if (!tableName) {
        console.log('Usage: .count <table_name>');
        this.displayPrompt();
        return;
      }
      try {
        const result = await dataSource.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        console.log(`${tableName}: ${result[0].count} records`);
      } catch (error) {
        console.log(`Error: ${(error as Error).message}`);
      }
      this.displayPrompt();
    },
  });

  replServer.defineCommand('sql', {
    help: 'Execute raw SQL: .sql <query>',
    action: async function (query: string) {
      if (!query) {
        console.log('Usage: .sql <query>');
        this.displayPrompt();
        return;
      }
      try {
        const result = await dataSource.query(query);
        console.log(result);
      } catch (error) {
        console.log(`Error: ${(error as Error).message}`);
      }
      this.displayPrompt();
    },
  });
}

startConsole().catch(console.error);
