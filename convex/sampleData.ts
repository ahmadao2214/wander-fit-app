import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Sample data creation script for development/testing
export const createSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if sample data already exists
    const existingUsers = await ctx.db.query("users").collect();
    if (existingUsers.length > 0) {
      throw new Error("Sample data already exists. Clear database first.");
    }

    const now = Date.now();
    
    // Create sample trainers
    const trainer1Id = await ctx.db.insert("users", {
      email: "sarah.trainer@wanderfit.com",
      name: "Sarah Johnson",
      role: "trainer",
      clerkId: "trainer_sarah_123", // Mock Clerk ID
      createdAt: now,
    });

    const trainer2Id = await ctx.db.insert("users", {
      email: "mike.trainer@wanderfit.com", 
      name: "Mike Rodriguez",
      role: "trainer",
      clerkId: "trainer_mike_456", // Mock Clerk ID
      createdAt: now,
    });

    // Create sample clients
    const client1Id = await ctx.db.insert("users", {
      email: "alex.client@email.com",
      name: "Alex Thompson",
      role: "client",
      trainerId: trainer1Id,
      clerkId: "client_alex_789", // Mock Clerk ID
      createdAt: now,
    });

    const client2Id = await ctx.db.insert("users", {
      email: "jordan.client@email.com",
      name: "Jordan Kim",
      role: "client", 
      trainerId: trainer1Id,
      clerkId: "client_jordan_101", // Mock Clerk ID
      createdAt: now,
    });

    const client3Id = await ctx.db.insert("users", {
      email: "sam.client@email.com",
      name: "Sam Wilson",
      role: "client",
      trainerId: trainer2Id,
      clerkId: "client_sam_202", // Mock Clerk ID
      createdAt: now,
    });

    // Create trainer-client relationships
    await ctx.db.insert("trainerClientRelationships", {
      trainerId: trainer1Id,
      clientId: client1Id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("trainerClientRelationships", {
      trainerId: trainer1Id,
      clientId: client2Id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("trainerClientRelationships", {
      trainerId: trainer2Id,
      clientId: client3Id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Create sample workouts
    const workout1Id = await ctx.db.insert("workouts", {
      trainerId: trainer1Id,
      clientId: client1Id,
      name: "Upper Body Strength",
      description: "Focus on building upper body muscle and strength",
      exercises: [
        {
          id: "ex_1_pushups",
          name: "Push-ups",
          sets: 3,
          reps: 12,
          restDuration: 60,
          orderIndex: 0,
          notes: "Keep your core tight and lower chest to ground"
        },
        {
          id: "ex_2_pullups",
          name: "Pull-ups",
          sets: 3,
          reps: 8,
          restDuration: 90,
          orderIndex: 1,
          notes: "Use assistance band if needed"
        },
        {
          id: "ex_3_plank",
          name: "Plank Hold",
          sets: 3,
          duration: 45,
          restDuration: 60,
          orderIndex: 2,
          notes: "Maintain straight line from head to heels"
        }
      ],
      createdAt: now,
      isActive: true,
    });

    const workout2Id = await ctx.db.insert("workouts", {
      trainerId: trainer1Id,
      clientId: client2Id,
      name: "Cardio Blast",
      description: "High intensity interval training for cardio fitness",
      exercises: [
        {
          id: "ex_4_burpees",
          name: "Burpees",
          sets: 4,
          reps: 10,
          restDuration: 45,
          orderIndex: 0,
          notes: "Explosive movement, land softly"
        },
        {
          id: "ex_5_jumping_jacks",
          name: "Jumping Jacks",
          sets: 3,
          duration: 30,
          restDuration: 30,
          orderIndex: 1,
          notes: "Keep pace steady and controlled"
        },
        {
          id: "ex_6_mountain_climbers",
          name: "Mountain Climbers",
          sets: 3,
          duration: 20,
          restDuration: 40,
          orderIndex: 2,
          notes: "Drive knees to chest quickly"
        }
      ],
      createdAt: now,
      isActive: true,
    });

    const workout3Id = await ctx.db.insert("workouts", {
      trainerId: trainer2Id,
      clientId: client3Id,
      name: "Lower Body Power",
      description: "Building leg strength and power",
      exercises: [
        {
          id: "ex_7_squats",
          name: "Squats",
          sets: 4,
          reps: 15,
          restDuration: 60,
          orderIndex: 0,
          notes: "Keep weight in heels, knees track over toes"
        },
        {
          id: "ex_8_lunges",
          name: "Alternating Lunges",
          sets: 3,
          reps: 12,
          restDuration: 45,
          orderIndex: 1,
          notes: "Step back into lunge, keep front knee over ankle"
        },
        {
          id: "ex_9_wall_sit",
          name: "Wall Sit",
          sets: 3,
          duration: 30,
          restDuration: 60,
          orderIndex: 2,
          notes: "Thighs parallel to ground, back flat against wall"
        }
      ],
      createdAt: now,
      isActive: true,
    });

    // Create a sample workout session (completed workout)
    await ctx.db.insert("workoutSessions", {
      workoutId: workout1Id,
      clientId: client1Id,
      startedAt: now - (2 * 24 * 60 * 60 * 1000), // 2 days ago
      completedAt: now - (2 * 24 * 60 * 60 * 1000) + (45 * 60 * 1000), // 45 minutes later
      totalDuration: 45 * 60, // 45 minutes in seconds
      status: "completed",
      exercises: [
        {
          exerciseId: "ex_1_pushups",
          completed: true,
          skipped: false,
          notes: "Felt good, could go heavier next time",
          sets: [
            { repsCompleted: 12, completed: true, skipped: false },
            { repsCompleted: 10, completed: true, skipped: false },
            { repsCompleted: 8, completed: true, skipped: false }
          ]
        },
        {
          exerciseId: "ex_2_pullups",
          completed: true,
          skipped: false,
          sets: [
            { repsCompleted: 8, completed: true, skipped: false },
            { repsCompleted: 6, completed: true, skipped: false },
            { repsCompleted: 5, completed: true, skipped: false }
          ]
        },
        {
          exerciseId: "ex_3_plank",
          completed: true,
          skipped: false,
          sets: [
            { durationCompleted: 45, completed: true, skipped: false },
            { durationCompleted: 40, completed: true, skipped: false },
            { durationCompleted: 35, completed: true, skipped: false }
          ]
        }
      ]
    });

    return {
      message: "Sample data created successfully!",
      created: {
        trainers: 2,
        clients: 3,
        workouts: 3,
        relationships: 3,
        sessions: 1
      },
      trainers: [
        { id: trainer1Id, name: "Sarah Johnson", email: "sarah.trainer@wanderfit.com" },
        { id: trainer2Id, name: "Mike Rodriguez", email: "mike.trainer@wanderfit.com" }
      ],
      clients: [
        { id: client1Id, name: "Alex Thompson", trainer: "Sarah Johnson" },
        { id: client2Id, name: "Jordan Kim", trainer: "Sarah Johnson" },
        { id: client3Id, name: "Sam Wilson", trainer: "Mike Rodriguez" }
      ]
    };
  },
});

// Clear all sample data (for testing)
export const clearSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete in reverse order of dependencies
    const sessions = await ctx.db.query("workoutSessions").collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    const workouts = await ctx.db.query("workouts").collect();
    for (const workout of workouts) {
      await ctx.db.delete(workout._id);
    }

    const relationships = await ctx.db.query("trainerClientRelationships").collect();
    for (const relationship of relationships) {
      await ctx.db.delete(relationship._id);
    }

    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    return {
      message: "All sample data cleared successfully!",
      deleted: {
        users: users.length,
        workouts: workouts.length,
        relationships: relationships.length,
        sessions: sessions.length
      }
    };
  },
});

// Get summary of current data (for testing)
export const getDataSummary = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const workouts = await ctx.db.query("workouts").collect();
    const relationships = await ctx.db.query("trainerClientRelationships").collect();
    const sessions = await ctx.db.query("workoutSessions").collect();

    const trainers = users.filter(u => u.role === "trainer");
    const clients = users.filter(u => u.role === "client");

    return {
      summary: {
        totalUsers: users.length,
        trainers: trainers.length,
        clients: clients.length,
        workouts: workouts.length,
        relationships: relationships.length,
        sessions: sessions.length
      },
      trainers: trainers.map(t => ({
        id: t._id,
        name: t.name,
        email: t.email,
        clientCount: clients.filter(c => c.trainerId === t._id).length
      })),
      clients: clients.map(c => {
        const trainer = trainers.find(t => t._id === c.trainerId);
        return {
          id: c._id,
          name: c.name,
          email: c.email,
          trainer: trainer ? trainer.name : "No trainer assigned"
        };
      })
    };
  },
});
