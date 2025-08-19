import { Router, Request, Response } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const authRouter = Router();

// Login route
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Set user in session
    (req.session as any).userId = user.id;
    (req.session as any).userRole = user.role;

    // Update last login time
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout route
authRouter.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logged out successfully' });
  });
});

// Check authentication status
authRouter.get('/status', (req: Request, res: Response) => {
  if ((req.session as any).userId) {
    return res.status(200).json({ 
      authenticated: true,
      userRole: (req.session as any).userRole
    });
  }
  
  return res.status(200).json({ authenticated: false });
});

// Get current user
authRouter.get('/user', async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create sample users for each role
authRouter.post('/setup-sample-users', async (req: Request, res: Response) => {
  try {
    // Check if sample users already exist
    const existingUsers = await db.select().from(users);
    const adminExists = existingUsers.some(user => user.role === 'ADMIN');
    const scrumMasterExists = existingUsers.some(user => user.role === 'SCRUM_MASTER');
    const regularUserExists = existingUsers.some(user => user.role === 'USER');
    
    if (adminExists && scrumMasterExists && regularUserExists) {
      return res.status(200).json({ message: 'Sample users already exist', users: existingUsers });
    }
    
    const salt = await bcrypt.genSalt(10);
    
    // Hash different passwords for each user type
    const adminHashedPassword = await bcrypt.hash('admin123', salt);
    const scrumHashedPassword = await bcrypt.hash('scrum123', salt);
    const userHashedPassword = await bcrypt.hash('user123', salt);
    
    const sampleUsers = [];
    
    // Create admin user if not exists
    if (!adminExists) {
      const [adminUser] = await db.insert(users).values({
        username: 'admin',
        email: 'admin@example.com',
        password: adminHashedPassword,
        fullName: 'Admin User',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      sampleUsers.push(adminUser);
    }
    
    // Create scrum master user if not exists
    if (!scrumMasterExists) {
      const [scrumUser] = await db.insert(users).values({
        username: 'scrummaster',
        email: 'scrum@example.com',
        password: scrumHashedPassword,
        fullName: 'Scrum Master',
        role: 'SCRUM_MASTER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      sampleUsers.push(scrumUser);
    }
    
    // Create regular user if not exists
    if (!regularUserExists) {
      const [regularUser] = await db.insert(users).values({
        username: 'user',
        email: 'user@example.com',
        password: userHashedPassword,
        fullName: 'Regular User',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      sampleUsers.push(regularUser);
    }
    
    return res.status(200).json({ 
      message: 'Sample users created successfully',
      users: sampleUsers
    });
  } catch (error) {
    console.error('Error creating sample users:', error);
    return res.status(500).json({ message: 'Error creating sample users' });
  }
});

export default authRouter;