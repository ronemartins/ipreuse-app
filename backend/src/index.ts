import express from 'express';
import cors from 'cors';
import { query } from './db/index';

const app = express();

app.use(cors());
// allow larger request bodies for image uploads
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;

async function ensureGroupIpsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS public.group_ips (
      id SERIAL PRIMARY KEY,
      group_id integer NOT NULL,
      ip_id integer NOT NULL,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_gi_group FOREIGN KEY (group_id) REFERENCES public.groups(id),
      CONSTRAINT fk_gi_ip FOREIGN KEY (ip_id) REFERENCES public.ip_core(id),
      CONSTRAINT uq_group_ip UNIQUE (group_id, ip_id)
    )
  `);
}

async function addDevelopmentSoftwareColumn() {
  try {
    // Check if column exists
    const result = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='ip_core' AND column_name='development_software'
    `);
    
    if (result.rows.length === 0) {
      // Add column if it doesn't exist
      await query(`
        ALTER TABLE ip_core 
        ADD COLUMN development_software varchar DEFAULT 'N/A'
      `);
      console.log('Added development_software column to ip_core table');
    }
  } catch (err) {
    console.error('Error checking/adding development_software column:', err);
  }
}

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Authentication
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Log da tentativa
  console.log('Login attempt:', { email, hasPassword: !!password });
  
  // Validar entrada
  if (!email || !password) {
    console.error('Missing email or password');
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    console.log('Querying database...');
    const result = await query('SELECT id, username, email, name, surname, role, is_active FROM users WHERE email = $1 AND password = $2', [email, password]);
    console.log('Query result:', { rowCount: result.rows.length });
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User found:', { id: user.id, email: user.email, active: user.is_active });
      
      // Check if user is active
      if (!user.is_active) {
        console.log('User is inactive');
        return res.status(403).json({ error: 'inactive', message: 'Entre em contato com o administrador' });
      }
      
      const response = { 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          name: user.name, 
          surname: user.surname, 
          role: user.role 
        }, 
        token: 'fake-jwt-token' 
      };
      console.log('Login successful for user:', user.email);
      res.json(response);
    } else {
      console.log('Invalid credentials for email:', email);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err: any) {
    console.error('Login error:', err.message, err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Users Management
// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await query('SELECT id, name, surname, email, is_active as active, role FROM users WHERE deleted_at IS NULL ORDER BY name ASC');
    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Create new user
app.post('/api/users/create', async (req, res) => {
  const { name, surname, email, password, request_user_id } = req.body;
  
  try {
    // Validate inputs
    if (!name || !surname || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if requester is admin
    if (request_user_id) {
      const requesterCheck = await query('SELECT role FROM users WHERE id = $1', [request_user_id]);
      if (requesterCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Usuário não autorizado' });
      }
      
      if (requesterCheck.rows[0].role !== 'administrador') {
        return res.status(403).json({ error: 'Apenas administradores podem criar novos usuários' });
      }
    } else {
      return res.status(403).json({ error: 'Autenticação necessária' });
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Create username from name and surname
    const username = (name + surname).toLowerCase().replace(/\s+/g, '');

    // Insert new user
    const result = await query(
      'INSERT INTO users (company_id, username, email, password, name, surname, is_active, role) VALUES ($1, $2, $3, $4, $5, $6, true, $7) RETURNING id, name, surname, email, is_active as active, role',
      [1, username, email, password, name, surname, 'usuario'] // company_id defaults to 1 (demo), role defaults to usuario
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Toggle user active status
app.put('/api/users/:id/toggle-status', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  try {
    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, surname, email, is_active as active',
      [active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Revoke user access (delete user)
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { request_user_id } = req.body;

  try {
    // Check if requester is admin
    if (request_user_id) {
      const requesterCheck = await query('SELECT role FROM users WHERE id = $1', [request_user_id]);
      if (requesterCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Usuário não autorizado' });
      }
      
      if (requesterCheck.rows[0].role !== 'administrador') {
        return res.status(403).json({ error: 'Apenas administradores podem revogar acesso de usuários' });
      }
    } else {
      return res.status(403).json({ error: 'Autenticação necessária' });
    }

    // Cannot delete yourself
    if (parseInt(id) === request_user_id) {
      return res.status(400).json({ error: 'Você não pode revogar seu próprio acesso' });
    }

    // Check if user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Soft delete by setting is_active to false and deleted_at
    const result = await query(
      'UPDATE users SET is_active = false, deleted_at = NOW() WHERE id = $1 RETURNING id, name, surname, email, is_active as active',
      [id]
    );

    res.json({ success: true, message: 'Acesso do usuário revogado com sucesso', user: result.rows[0] });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get all IPs
app.get('/api/ips', async (req, res) => {
  try {
    const result = await query(`
      SELECT ic.*, e.name as company_name, l.name as license_name, u.name as author_name 
      FROM ip_core ic
      LEFT JOIN enterprise e ON ic.company_id = e.id
      LEFT JOIN license l ON ic.license_id = l.id
      LEFT JOIN users u ON ic.created_by = u.id
    `);
    
    // Map db columns to frontend expected format
    const ips = result.rows.map(row => {
      let imageData = null;
      if (row.image_data && row.image_mime_type) {
        imageData = `data:${row.image_mime_type};base64,${row.image_data.toString('base64')}`;
      }
      
      return {
        id: row.id.toString(),
        name: row.title,
        description: row.description,
        partNumber: row.part_number || `IP-${row.id}`,
        status: row.status || 'Active',
        license: row.license_name || 'N/A',
        tags: [row.type, row.compatibility],
        features: Array.isArray(row.features) ? row.features : (row.features ? JSON.parse(row.features) : []),
        overview: row.overview || row.description,
        applications: Array.isArray(row.applications) ? row.applications : (row.applications ? JSON.parse(row.applications) : []),
        technology: row.compatibility || 'N/A',
        developmentSoftware: row.development_software || 'N/A',
        functionalDescription: row.functional_description || 'N/A',
        specifications: Array.isArray(row.specifications) ? row.specifications : (row.specifications ? JSON.parse(row.specifications) : []),
        deliverables: [],
        category: row.type,
        maturity: row.maturity_level,
        institution: row.company_name,
        image: imageData
      };
    });

    res.json(ips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific IP
app.get('/api/ips/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`
      SELECT ic.*, e.name as company_name, l.name as license_name, u.name as author_name 
      FROM ip_core ic
      LEFT JOIN enterprise e ON ic.company_id = e.id
      LEFT JOIN license l ON ic.license_id = l.id
      LEFT JOIN users u ON ic.created_by = u.id
      WHERE ic.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'IP not found' });
    }

    const row = result.rows[0];
    
    let imageData = null;
    if (row.image_data && row.image_mime_type) {
      imageData = `data:${row.image_mime_type};base64,${row.image_data.toString('base64')}`;
    }
    
    const ip = {
      id: row.id.toString(),
      name: row.title,
      description: row.description,
      partNumber: row.part_number || `IP-${row.id}`,
      status: row.status || 'Active',
      license: row.license_name || 'N/A',
      tags: [row.type, row.compatibility],
      features: Array.isArray(row.features) ? row.features : (row.features ? JSON.parse(row.features) : []),
      overview: row.overview || row.description,
      applications: Array.isArray(row.applications) ? row.applications : (row.applications ? JSON.parse(row.applications) : []),
      technology: row.compatibility || 'N/A',
      developmentSoftware: row.development_software || 'N/A',
      functionalDescription: row.functional_description || 'N/A',
      specifications: Array.isArray(row.specifications) ? row.specifications : (row.specifications ? JSON.parse(row.specifications) : []),
      deliverables: [],
      category: row.type,
      maturity: row.maturity_level,
      institution: row.company_name,
      image: imageData
    };

    res.json(ip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search IPs by title (for autocomplete)
app.get('/api/ips/search', async (req, res) => {
  const { q } = req.query;
  try {
    const searchTerm = q ? `%${q}%` : '%';
    const result = await query(`
      SELECT id, title, type, part_number
      FROM ip_core
      WHERE title ILIKE $1 OR part_number ILIKE $1
      ORDER BY title ASC
      LIMIT 10
    `, [searchTerm]);

    const ips = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      type: row.type,
      partNumber: row.part_number || `IP-${row.id}`
    }));

    res.json(ips);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Create IP
app.post('/api/ips', async (req, res) => {
  const { title, description, type, maturity_level, compatibility, development_software, license_id, company_id, created_by, part_number, status, overview, functional_description, features, applications, specifications, image, dependencies } = req.body;
  
  try {
    // Convert base64 image to buffer if provided
    let imageBuffer = null;
    let imageMimeType = null;
    
    if (image && image.startsWith('data:image/')) {
      // Extract MIME type and base64 data
      const matches = image.match(/^data:image\/([^;]+);base64,(.+)$/);
      if (matches) {
        imageMimeType = `image/${matches[1]}`;
        imageBuffer = Buffer.from(matches[2], 'base64');
      }
    }
    
    const result = await query(`
      INSERT INTO ip_core (company_id, created_by, title, description, type, maturity_level, compatibility, development_software, license_id, part_number, status, overview, functional_description, features, applications, specifications, image_data, image_mime_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      company_id || 1, // Fallback to seed data ID
      created_by || 1, 
      title, 
      description, 
      type || 'digital', 
      maturity_level || 'prototipado', 
      compatibility || 'N/A',
      development_software || 'N/A', 
      license_id || 1,
      part_number || null,
      status || 'Active',
      overview || description || null,
      functional_description || null,
      JSON.stringify(features || []),
      JSON.stringify(applications || []),
      JSON.stringify(specifications || []),
      imageBuffer,
      imageMimeType
    ]);
    
    const savedIp = result.rows[0];

    // Save dependencies if provided
    if (Array.isArray(dependencies) && dependencies.length > 0) {
      for (const depId of dependencies) {
        try {
          await query(`
            INSERT INTO ip_dependencies (ip_id, depends_on_ip_id)
            VALUES ($1, $2)
            ON CONFLICT (ip_id, depends_on_ip_id) DO NOTHING
          `, [savedIp.id, depId]);
        } catch (depErr) {
          console.error('Error saving dependency:', depErr);
        }
      }
    }
    
    res.status(201).json(savedIp);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get IP dependencies
app.get('/api/ips/:id/dependencies', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT ic.id, ic.title, ic.type, ic.part_number
      FROM ip_dependencies id
      JOIN ip_core ic ON id.depends_on_ip_id = ic.id
      WHERE id.ip_id = $1
      ORDER BY ic.title ASC
    `, [id]);

    const dependencies = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      type: row.type,
      partNumber: row.part_number || `IP-${row.id}`
    }));

    res.json(dependencies);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Add dependency to IP
app.post('/api/ips/:id/dependencies', async (req, res) => {
  const { id } = req.params;
  const { depends_on_ip_id } = req.body;

  try {
    if (!depends_on_ip_id) {
      return res.status(400).json({ error: 'depends_on_ip_id is required' });
    }

    // Verify both IPs exist
    const ipCheck = await query('SELECT id FROM ip_core WHERE id IN ($1, $2)', [id, depends_on_ip_id]);
    if (ipCheck.rows.length < 2) {
      return res.status(404).json({ error: 'One or both IPs not found' });
    }

    // Prevent self-dependency
    if (Number(id) === Number(depends_on_ip_id)) {
      return res.status(400).json({ error: 'Um IP não pode depender de si mesmo' });
    }

    const result = await query(`
      INSERT INTO ip_dependencies (ip_id, depends_on_ip_id)
      VALUES ($1, $2)
      ON CONFLICT (ip_id, depends_on_ip_id) DO NOTHING
      RETURNING *
    `, [id, depends_on_ip_id]);

    res.status(201).json(result.rows[0] || { message: 'Dependência já existe' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Remove IP dependency
app.delete('/api/ips/:id/dependencies/:depId', async (req, res) => {
  const { id, depId } = req.params;

  try {
    const deleteResult = await query(`
      DELETE FROM ip_dependencies
      WHERE ip_id = $1 AND depends_on_ip_id = $2
      RETURNING *
    `, [id, depId]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dependência não encontrada' });
    }

    res.json({ message: 'Dependência removida com sucesso' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update IP
app.put('/api/ips/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, type, maturity_level, compatibility, development_software, license_id, company_id, created_by, part_number, status, overview, functional_description, features, applications, specifications, image } = req.body;
  
  try {
    // Convert base64 image to buffer if provided
    let imageBuffer = undefined;
    let imageMimeType = undefined;
    
    if (image && image.startsWith('data:image/')) {
      // Extract MIME type and base64 data
      const matches = image.match(/^data:image\/([^;]+);base64,(.+)$/);
      if (matches) {
        imageMimeType = `image/${matches[1]}`;
        imageBuffer = Buffer.from(matches[2], 'base64');
      }
    }
    
    // Build SET clause dynamically based on what's provided
    let updateFields = [];
    let values: any[] = [];
    let paramIndex = 1;
    
    if (title !== undefined) { updateFields.push(`title = $${paramIndex}`); values.push(title); paramIndex++; }
    if (description !== undefined) { updateFields.push(`description = $${paramIndex}`); values.push(description); paramIndex++; }
    if (type !== undefined) { updateFields.push(`type = $${paramIndex}`); values.push(type); paramIndex++; }
    if (maturity_level !== undefined) { updateFields.push(`maturity_level = $${paramIndex}`); values.push(maturity_level); paramIndex++; }
    if (compatibility !== undefined) { updateFields.push(`compatibility = $${paramIndex}`); values.push(compatibility); paramIndex++; }
    if (development_software !== undefined) { updateFields.push(`development_software = $${paramIndex}`); values.push(development_software); paramIndex++; }
    if (license_id !== undefined) { updateFields.push(`license_id = $${paramIndex}`); values.push(license_id); paramIndex++; }
    if (part_number !== undefined) { updateFields.push(`part_number = $${paramIndex}`); values.push(part_number); paramIndex++; }
    if (status !== undefined) { updateFields.push(`status = $${paramIndex}`); values.push(status); paramIndex++; }
    if (overview !== undefined) { updateFields.push(`overview = $${paramIndex}`); values.push(overview); paramIndex++; }
    if (functional_description !== undefined) { updateFields.push(`functional_description = $${paramIndex}`); values.push(functional_description); paramIndex++; }
    if (features !== undefined) { updateFields.push(`features = $${paramIndex}`); values.push(JSON.stringify(features)); paramIndex++; }
    if (applications !== undefined) { updateFields.push(`applications = $${paramIndex}`); values.push(JSON.stringify(applications)); paramIndex++; }
    if (specifications !== undefined) { updateFields.push(`specifications = $${paramIndex}`); values.push(JSON.stringify(specifications)); paramIndex++; }
    if (imageBuffer !== undefined) { updateFields.push(`image_data = $${paramIndex}`); values.push(imageBuffer); paramIndex++; }
    if (imageMimeType !== undefined) { updateFields.push(`image_mime_type = $${paramIndex}`); values.push(imageMimeType); paramIndex++; }
    
    updateFields.push(`updated_at = NOW()`);
    
    values.push(id); // Add ID for WHERE clause
    
    if (updateFields.length === 1) { // Only updated_at
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const result = await query(`
      UPDATE ip_core 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'IP not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get all groups
app.get('/api/groups', async (req, res) => {
  try {
    const result = await query(`
      SELECT g.*, u.name as lead_name, COUNT(DISTINCT gm.user_id) as members_count
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.deleted_at IS NULL
      GROUP BY g.id, u.name
      ORDER BY g.created_at DESC
    `);
    
    const groups = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description || '',
      technology: row.technology || 'N/A',
      members: parseInt(row.members_count) || 0,
      ips: 0,
      lead: row.lead_name || 'N/A'
    }));

    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific group
app.get('/api/groups/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`
      SELECT g.*, u.name as lead_name, COUNT(DISTINCT gm.user_id) as members_count
      FROM groups g
      LEFT JOIN users u ON g.created_by = u.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.id = $1 AND g.deleted_at IS NULL
      GROUP BY g.id, u.name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const row = result.rows[0];
    const group = {
      id: row.id.toString(),
      name: row.name,
      description: row.description || '',
      technology: row.technology || 'N/A',
      members: parseInt(row.members_count) || 0,
      ips: 0,
      lead: row.lead_name || 'N/A'
    };

    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create group
app.post('/api/groups', async (req, res) => {
  const { name, description, technology, company_id, created_by } = req.body;
  
  try {
    // Start transaction - create group and add creator as "gestor"
    const groupResult = await query(`
      INSERT INTO groups (name, description, technology, company_id, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      name,
      description || '',
      technology || 'N/A',
      company_id || 1,
      created_by || 1
    ]);
    
    const group = groupResult.rows[0];

    // Add creator as gestor (group manager)
    await query(`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, 'gestor')
    `, [group.id, created_by || 1]);

    // Log activity
    await query(`
      INSERT INTO group_activities (group_id, user_id, activity_type, description, entity_type)
      VALUES ($1, $2, 'grupo_criado', $3, 'grupo')
    `, [group.id, created_by || 1, `Grupo "${name}" foi criado`]);

    res.status(201).json({
      id: group.id.toString(),
      name: group.name,
      description: group.description || '',
      technology: group.technology || 'N/A',
      members: 1,
      ips: 0,
      lead: 'Você'
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Add member to group
app.post('/api/groups/:id/members', async (req, res) => {
  const { id } = req.params;
  const { user_id, role = 'colaborador' } = req.body;

  try {
    if (!user_id) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }

    // Validate role
    const validRoles = ['gestor', 'administrador', 'projetista', 'colaborador'];
    const userRole = validRoles.includes(role?.toLowerCase()) ? role.toLowerCase() : 'colaborador';

    // Check if user exists
    const userCheck = await query('SELECT id, name, surname FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const userName = userCheck.rows[0].name + ' ' + userCheck.rows[0].surname;

    // Check if group exists
    const groupCheck = await query('SELECT id FROM groups WHERE id = $1', [id]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    // Check if user is already a member
    const memberCheck = await query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, user_id]
    );
    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário já é membro deste grupo' });
    }

    // Add member to group
    const result = await query(`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, user_id, userRole]);

    // Log activity
    await query(`
      INSERT INTO group_activities (group_id, user_id, activity_type, description, entity_type, entity_id)
      VALUES ($1, $2, 'membro_adicionado', $3, 'membro', $4)
    `, [id, req.body.request_user_id || user_id, `${userName} foi adicionado como ${userRole}`, user_id]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Remove member from group (only gestor or administrador can do this)
app.delete('/api/groups/:id/members/:userId', async (req, res) => {
  const { id, userId } = req.params;
  const { request_user_id } = req.body;

  try {
    // Check if requester is gestor or administrador
    const requesterCheck = await query(`
      SELECT role FROM group_members 
      WHERE group_id = $1 AND user_id = $2
    `, [id, request_user_id]);

    if (requesterCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Você não é membro deste grupo' });
    }

    const requesterRole = requesterCheck.rows[0].role;
    if (!['gestor', 'administrador'].includes(requesterRole)) {
      return res.status(403).json({ error: 'Você não tem permissão para remover membros' });
    }

    // Cannot remove the gestor
    const memberCheck = await query(`
      SELECT role FROM group_members 
      WHERE group_id = $1 AND user_id = $2
    `, [id, userId]);

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }

    if (memberCheck.rows[0].role === 'gestor') {
      return res.status(400).json({ error: 'Não é possível remover o gestor do grupo' });
    }

    // Remove member
    await query(`
      DELETE FROM group_members 
      WHERE group_id = $1 AND user_id = $2
    `, [id, userId]);

    res.json({ success: true, message: 'Membro removido com sucesso' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get group members
app.get('/api/groups/:id/members', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT gm.id, u.id as user_id, u.name, u.surname, u.email, gm.role
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
      ORDER BY CASE WHEN gm.role = 'gestor' THEN 0 WHEN gm.role = 'administrador' THEN 1 ELSE 2 END, u.name ASC
    `, [id]);

    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get group activities
app.get('/api/groups/:id/activities', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT ga.id, ga.activity_type, ga.description, ga.created_at, u.name, u.surname
      FROM group_activities ga
      LEFT JOIN users u ON ga.user_id = u.id
      WHERE ga.group_id = $1
      ORDER BY ga.created_at DESC
      LIMIT 20
    `, [id]);

    const activities = result.rows.map(row => ({
      id: row.id,
      type: row.activity_type,
      description: row.description,
      user: row.name ? `${row.name} ${row.surname}` : 'Sistema',
      time: row.created_at
    }));

    res.json(activities);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get count of IPs in a group
app.get('/api/groups/:id/ips-count', async (req, res) => {
  const { id } = req.params;

  try {
    await ensureGroupIpsTable();

    const result = await query(`
      SELECT COUNT(*) as count
      FROM group_ips
      WHERE group_id = $1
    `, [id]);

    res.json({ count: parseInt(result.rows[0].count) || 0 });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get IPs linked to a group
app.get('/api/groups/:id/ips', async (req, res) => {
  const { id } = req.params;

  try {
    await ensureGroupIpsTable();

    const result = await query(`
      SELECT gi.id as group_ip_id, gi.created_at as linked_at, ic.id, ic.title, ic.description, ic.status, ic.type
      FROM group_ips gi
      JOIN ip_core ic ON gi.ip_id = ic.id
      WHERE gi.group_id = $1
      ORDER BY gi.created_at DESC, ic.title ASC
    `, [id]);

    const ips = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.title,
      description: row.description || '',
      status: row.status || 'Active',
      category: row.type || 'N/A',
      linkedAt: row.linked_at
    }));

    res.json(ips);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Link IP to group
app.post('/api/groups/:id/ips', async (req, res) => {
  const { id } = req.params;
  const { ip_id, user_id } = req.body;

  try {
    if (!ip_id) {
      return res.status(400).json({ error: 'ip_id é obrigatório' });
    }

    // Check if group exists
    const groupCheck = await query('SELECT id FROM groups WHERE id = $1', [id]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    // Check if IP exists
    const ipCheck = await query('SELECT id, title FROM ip_core WHERE id = $1', [ip_id]);
    if (ipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'IP não encontrado' });
    }
    const ipTitle = ipCheck.rows[0].title;

    await ensureGroupIpsTable();

    // Check if already linked
    const linkCheck = await query(
      'SELECT id FROM group_ips WHERE group_id = $1 AND ip_id = $2',
      [id, ip_id]
    );
    if (linkCheck.rows.length > 0) {
      return res.status(400).json({ error: 'IP já está vinculado a este grupo' });
    }

    // Link IP
    const result = await query(`
      INSERT INTO group_ips (group_id, ip_id)
      VALUES ($1, $2)
      RETURNING *
    `, [id, ip_id]);

    // Log activity
    await query(`
      INSERT INTO group_activities (group_id, user_id, activity_type, description, entity_type, entity_id)
      VALUES ($1, $2, 'ip_vinculado', $3, 'ip', $4)
    `, [id, user_id, `IP "${ipTitle}" foi vinculado ao grupo`, ip_id]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// IP Documents Management
// Upload document to IP
app.post('/api/ips/:id/documents', async (req, res) => {
  const { id } = req.params;
  const { documentType, fileName, fileMimeType, fileData, description, uploadedBy } = req.body;

  try {
    // Validate inputs
    if (!fileName || !fileData || !documentType) {
      console.error('Missing required fields:', { fileName, hasData: !!fileData, documentType });
      return res.status(400).json({ error: 'fileName, fileData, and documentType are required' });
    }

    // Verify IP exists
    const ipCheck = await query('SELECT id FROM ip_core WHERE id = $1', [id]);
    if (ipCheck.rows.length === 0) {
      console.error('IP not found:', id);
      return res.status(404).json({ error: 'IP not found' });
    }

    // Convert base64 to buffer
    let fileBuffer = null;
    let fileSize = 0;
    
    try {
      if (fileData && fileData.startsWith('data:')) {
        // Extract base64 data
        const matches = fileData.match(/^data:[^;]+;base64,(.+)$/);
        if (matches && matches[1]) {
          fileBuffer = Buffer.from(matches[1], 'base64');
          fileSize = fileBuffer.length;
        } else {
          console.error('Failed to extract base64 from data URI');
          return res.status(400).json({ error: 'Invalid file data format' });
        }
      } else if (fileData) {
        // Assume it's already base64
        fileBuffer = Buffer.from(fileData, 'base64');
        fileSize = fileBuffer.length;
      }
    } catch (convErr: any) {
      console.error('Error converting base64:', convErr);
      return res.status(400).json({ error: 'Invalid file data: ' + convErr.message });
    }

    if (!fileBuffer || fileSize === 0) {
      console.error('File buffer is empty');
      return res.status(400).json({ error: 'File data is empty' });
    }

    console.log(`Uploading file: ${fileName}, size: ${fileSize}, type: ${documentType}`);

    // Insert document
    const result = await query(`
      INSERT INTO ip_documents (ip_id, document_type, file_name, file_size, file_mime_type, file_data, description, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, ip_id, document_type, file_name, file_size, file_mime_type, description, created_at, uploaded_by
    `, [id, documentType, fileName, fileSize, fileMimeType || 'application/octet-stream', fileBuffer, description || null, uploadedBy || null]);

    if (!result.rows || result.rows.length === 0) {
      console.error('Failed to insert document');
      return res.status(500).json({ error: 'Failed to insert document' });
    }

    console.log(`Document uploaded successfully with ID: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Document upload error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get documents for an IP
app.get('/api/ips/:id/documents', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT id, ip_id, document_type, file_name, file_size, file_mime_type, description, created_at, uploaded_by
      FROM ip_documents
      WHERE ip_id = $1
      ORDER BY document_type, created_at DESC
    `, [id]);

    res.json(result.rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Download document
app.get('/api/ips/:id/documents/:docId', async (req, res) => {
  const { id, docId } = req.params;

  try {
    const result = await query(`
      SELECT id, file_name, file_mime_type, file_data
      FROM ip_documents
      WHERE ip_id = $1 AND id = $2
    `, [id, docId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
    res.setHeader('Content-Type', doc.file_mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.send(doc.file_data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete document
app.delete('/api/ips/:id/documents/:docId', async (req, res) => {
  const { id, docId } = req.params;

  try {
    const deleteResult = await query(`
      DELETE FROM ip_documents
      WHERE ip_id = $1 AND id = $2
      RETURNING id
    `, [id, docId]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get dashboard statistics and recent activity
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // Total IPs
    const totalIpsResult = await query('SELECT COUNT(*) as count FROM ip_core WHERE deleted_at IS NULL');
    const totalIps = parseInt(totalIpsResult.rows[0].count) || 0;

    // Count IPs by status (validado)
    const validatedResult = await query(`
      SELECT COUNT(*) as count FROM ip_core 
      WHERE deleted_at IS NULL AND (status = 'validado' OR status = 'Validado' OR maturity_level = 'validado' OR maturity_level = 'Validado')
    `);
    const validatedIps = parseInt(validatedResult.rows[0].count) || 0;

    // Active groups
    const groupsResult = await query('SELECT COUNT(*) as count FROM groups WHERE deleted_at IS NULL');
    const activeGroups = parseInt(groupsResult.rows[0].count) || 0;

    // Pending review (prototipado or esquemático)
    const pendingResult = await query(`
      SELECT COUNT(*) as count FROM ip_core 
      WHERE deleted_at IS NULL AND (maturity_level = 'prototipado' OR maturity_level = 'esquemático')
    `);
    const pendingReview = parseInt(pendingResult.rows[0].count) || 0;

    // Recent IPs - fixed query with proper aliases
    const recentIpsResult = await query(`
      SELECT ic.id, ic.title, ic.type, ic.part_number, l.name as license, ic.maturity_level, u.name as author_name, u.surname as author_surname
      FROM ip_core ic
      LEFT JOIN license l ON ic.license_id = l.id
      LEFT JOIN users u ON ic.created_by = u.id
      WHERE ic.deleted_at IS NULL
      ORDER BY ic.created_at DESC
      LIMIT 4
    `);
    
    const recentIps = recentIpsResult.rows.map(row => ({
      id: row.id,
      name: row.title,
      license: row.license || 'N/A',
      status: row.maturity_level || 'prototipado',
      author: `${row.author_name || 'Admin'} ${row.author_surname || ''}`.trim(),
      type: row.type,
      partNumber: row.part_number || `IP-${row.id}`
    }));

    // Recent activity - made more robust with null checks
    let recentActivity: any[] = [];
    
    try {
      const recentActivityResult = await query(`
        SELECT ic.id, ic.title, ipc.created_at, u.name, u.surname
        FROM ip_comment ipc
        JOIN ip_core ic ON ipc.ip_id = ic.id
        JOIN users u ON ipc.user_id = u.id
        WHERE ic.deleted_at IS NULL
        ORDER BY ipc.created_at DESC
        LIMIT 4
      `);

      recentActivity = recentActivityResult.rows.map(row => ({
        user: `${row.name || 'Anônimo'} ${row.surname || ''}`.trim(),
        action: 'comentou em',
        item: row.title,
        time: row.created_at,
        ipId: row.id
      }));
    } catch (commentErr) {
      // If comments table has issues, just skip and use IP creations
      console.log('Note: ip_comment table query had issue, using IP creations only');
    }

    // Add recent IP creations if not enough comments
    if (recentActivity.length < 4) {
      try {
        const recentCreationsResult = await query(`
          SELECT ic.id, ic.title, ic.created_at, u.name, u.surname
          FROM ip_core ic
          JOIN users u ON ic.created_by = u.id
          WHERE ic.deleted_at IS NULL
          ORDER BY ic.created_at DESC
          LIMIT ${4 - recentActivity.length}
        `);

        const createdIps = recentCreationsResult.rows.map(row => ({
          user: `${row.name || 'Admin'} ${row.surname || ''}`.trim(),
          action: 'criou',
          item: row.title,
          time: row.created_at,
          ipId: row.id
        }));

        recentActivity.push(...createdIps);
        recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        recentActivity.splice(4);
      } catch (creationErr) {
        console.log('Note: IP creation activity query had issue');
      }
    }

    res.json({
      stats: [
        { title: 'Total de IPs', value: totalIps.toString(), change: '+12%' },
        { title: 'IPs Validados', value: validatedIps.toString(), change: '+8%' },
        { title: 'Grupos Ativos', value: activeGroups.toString(), change: '+5%' },
        { title: 'Pendentes Revisão', value: pendingReview.toString(), change: '-3%' }
      ],
      recentIps,
      recentActivity
    });
  } catch (err: any) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get reports statistics
app.get('/api/reports/stats', async (req, res) => {
  try {
    // Total IPs count
    const totalIpsResult = await query('SELECT COUNT(*) as count FROM ip_core WHERE deleted_at IS NULL');
    const totalIps = parseInt(totalIpsResult.rows[0].count) || 0;

    // Total downloads (from documents table)
    const totalDownloadsResult = await query('SELECT COUNT(*) as count FROM ip_documents');
    const totalDownloads = parseInt(totalDownloadsResult.rows[0].count) || 0;

    // Active institutions/companies
    const institutionsResult = await query(`
      SELECT COUNT(DISTINCT e.id) as count 
      FROM enterprise e
      WHERE e.is_active = true
    `);
    const activeInstitutions = parseInt(institutionsResult.rows[0].count) || 0;

    // IPs by type
    const ipsByTypeResult = await query(`
      SELECT type as name, COUNT(*) as value
      FROM ip_core
      WHERE deleted_at IS NULL
      GROUP BY type
      ORDER BY value DESC
    `);
    const ipsByType = ipsByTypeResult.rows.map(row => ({
      name: row.name || 'Sem tipo',
      value: parseInt(row.value) || 0
    }));

    // IPs by maturity level
    const ipsByMaturityResult = await query(`
      SELECT maturity_level as name, COUNT(*) as value
      FROM ip_core
      WHERE deleted_at IS NULL
      GROUP BY maturity_level
      ORDER BY value DESC
    `);
    const ipsByMaturity = ipsByMaturityResult.rows.map(row => ({
      name: row.name || 'Sem maturidade',
      value: parseInt(row.value) || 0
    }));

    // IPs by institution/company
    const ipsByInstitutionResult = await query(`
      SELECT e.name, COUNT(DISTINCT ic.id) as ips, COUNT(DISTINCT ipd.id) as downloads
      FROM enterprise e
      LEFT JOIN ip_core ic ON e.id = ic.company_id AND ic.deleted_at IS NULL
      LEFT JOIN ip_documents ipd ON ic.id = ipd.ip_id
      WHERE e.is_active = true
      GROUP BY e.id, e.name
      ORDER BY COUNT(DISTINCT ic.id) DESC
      LIMIT 10
    `);
    const ipsByInstitution = ipsByInstitutionResult.rows.map(row => ({
      name: row.name,
      ips: parseInt(row.ips) || 0,
      downloads: parseInt(row.downloads) || 0
    }));

    // Recent changes (IP version history or latest modifications)
    const recentChangesResult = await query(`
      SELECT ic.id, ic.title, ic.type, ivh.description as change, u.name, u.surname, ivh.created_at
      FROM ip_version_history ivh
      JOIN ip_core ic ON ivh.ip_id = ic.id
      JOIN users u ON ivh.author_id = u.id
      WHERE ic.deleted_at IS NULL
      ORDER BY ivh.created_at DESC
      LIMIT 10
    `);

    const recentChanges = recentChangesResult.rows.map(row => ({
      ip: row.title,
      change: row.description || 'Alteração no IP',
      user: `${row.name} ${row.surname}`,
      date: new Date(row.created_at).toISOString().split('T')[0],
      category: row.type || 'N/A'
    }));

    // If no version history, get recent IP modifications
    if (recentChanges.length === 0) {
      const recentModsResult = await query(`
        SELECT ic.id, ic.title, ic.type, 'IP criado' as change, u.name, u.surname, ic.created_at
        FROM ip_core ic
        JOIN users u ON ic.created_by = u.id
        WHERE ic.deleted_at IS NULL
        ORDER BY ic.created_at DESC
        LIMIT 10
      `);

      recentChanges.push(...recentModsResult.rows.map(row => ({
        ip: row.title,
        change: row.change,
        user: `${row.name} ${row.surname}`,
        date: new Date(row.created_at).toISOString().split('T')[0],
        category: row.type || 'N/A'
      })));
    }

    res.json({
      stats: {
        totalIps,
        totalDownloads,
        activeInstitutions
      },
      ipsByType,
      ipsByMaturity,
      ipsByInstitution,
      recentChanges: recentChanges.slice(0, 10)
    });
  } catch (err: any) {
    console.error('Reports stats error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, async () => {
  console.log(`Backend server running on port ${PORT}`);
  // Run migrations
  await addDevelopmentSoftwareColumn();
});
