// backend/src/controllers/studentRegistryController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userType: string;
  };
}

// Get all registry items for a student
export const getRegistryItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get student by userId
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get all registry items for this student
    const registryItems = await prisma.registry.findMany({
      where: { studentId: student.id },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Transform the data to match frontend interface
    const formattedItems = registryItems.map(item => ({
      id: item.id,
      name: item.itemName,
      description: item.itemDescription || '',
      price: parseFloat(item.price.toString()),
      priority: item.priority as 'high' | 'medium' | 'low',
      category: item.category,
      isReceived: item.fundedStatus === 'received'
    }));

    res.json({
      success: true,
      items: formattedItems
    });
  } catch (error) {
    console.error('Error fetching registry items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registry items'
    });
  }
};

// Create a new registry item
export const createRegistryItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, description, price, priority, category } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate required fields
    if (!name || !category || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and price are required'
      });
    }

    // Validate price
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    // Validate priority
    const validPriorities = ['high', 'medium', 'low'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be high, medium, or low'
      });
    }

    // Get student by userId
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Create registry item
    const registryItem = await prisma.registry.create({
      data: {
        studentId: student.id,
        itemName: name,
        itemDescription: description || null,
        price: priceNum,
        category,
        priority: priority || 'medium',
        fundedStatus: 'needed'
      }
    });

    // Format response
    const formattedItem = {
      id: registryItem.id,
      name: registryItem.itemName,
      description: registryItem.itemDescription || '',
      price: parseFloat(registryItem.price.toString()),
      priority: registryItem.priority as 'high' | 'medium' | 'low',
      category: registryItem.category,
      isReceived: registryItem.fundedStatus === 'received'
    };

    res.status(201).json({
      success: true,
      item: formattedItem,
      message: 'Registry item created successfully'
    });
  } catch (error) {
    console.error('Error creating registry item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create registry item'
    });
  }
};

// Update a registry item
export const updateRegistryItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;
    const { name, description, price, priority, category, isReceived } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get student by userId
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if registry item exists and belongs to this student
    const existingItem = await prisma.registry.findFirst({
      where: {
        id: itemId,
        studentId: student.id
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Registry item not found'
      });
    }

    // Prepare update data
    const updateData: any = {};

    if (name !== undefined) updateData.itemName = name;
    if (description !== undefined) updateData.itemDescription = description || null;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) {
      const validPriorities = ['high', 'medium', 'low'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: 'Priority must be high, medium, or low'
        });
      }
      updateData.priority = priority;
    }
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid price is required'
        });
      }
      updateData.price = priceNum;
    }
    if (isReceived !== undefined) {
      updateData.fundedStatus = isReceived ? 'received' : 'needed';
    }

    // Update the registry item
    const updatedItem = await prisma.registry.update({
      where: { id: itemId },
      data: updateData
    });

    // Format response
    const formattedItem = {
      id: updatedItem.id,
      name: updatedItem.itemName,
      description: updatedItem.itemDescription || '',
      price: parseFloat(updatedItem.price.toString()),
      priority: updatedItem.priority as 'high' | 'medium' | 'low',
      category: updatedItem.category,
      isReceived: updatedItem.fundedStatus === 'received'
    };

    res.json({
      success: true,
      item: formattedItem,
      message: 'Registry item updated successfully'
    });
  } catch (error) {
    console.error('Error updating registry item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update registry item'
    });
  }
};

// Delete a registry item
export const deleteRegistryItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get student by userId
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if registry item exists and belongs to this student
    const existingItem = await prisma.registry.findFirst({
      where: {
        id: itemId,
        studentId: student.id
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Registry item not found'
      });
    }

    // Delete the registry item
    await prisma.registry.delete({
      where: { id: itemId }
    });

    res.json({
      success: true,
      message: 'Registry item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting registry item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete registry item'
    });
  }
};