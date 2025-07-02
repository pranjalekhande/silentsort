/**
 * User Authentication Service
 * Handles user login, logout, and session management
 * @author Pranjal Ekhande
 * @version 1.2.0
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { SessionManager } from '../utils/SessionManager.js';

class UserAuthenticationService {
  constructor() {
    this.sessionManager = new SessionManager();
    this.saltRounds = 12;
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret';
  }

  /**
   * Authenticate user with email and password
   * @param {string} email - User email address
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} Authentication result with token
   */
  async authenticateUser(email, password) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role 
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      // Create session
      const session = await this.sessionManager.createSession(user.id, token);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token,
        sessionId: session.id,
        expiresAt: session.expiresAt
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Register new user account
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  async registerUser(userData) {
    try {
      const { email, password, name } = userData;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);

      // Create new user
      const newUser = await User.create({
        email,
        name,
        hashedPassword,
        role: 'user',
        createdAt: new Date()
      });

      return {
        success: true,
        message: 'User registered successfully',
        userId: newUser.id
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logout user and invalidate session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<boolean>} Logout success status
   */
  async logoutUser(sessionId) {
    try {
      await this.sessionManager.destroySession(sessionId);
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  /**
   * Validate JWT token and return user data
   * @param {string} token - JWT token
   * @returns {Promise<Object|null>} User data or null if invalid
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  /**
   * Reset user password
   * @param {string} email - User email
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Reset success status
   */
  async resetPassword(email, newPassword) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);
      await User.updatePassword(user.id, hashedPassword);

      // Invalidate all existing sessions
      await this.sessionManager.destroyAllUserSessions(user.id);

      return true;
    } catch (error) {
      console.error('Password reset failed:', error);
      return false;
    }
  }
}

export default UserAuthenticationService; 