import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGO_URI || "";

// Maintain a cached client across hot reloads and serverless function executions
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  console.error("MONGO_URI is missing from environment variables.");
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

async function getCollection() {
  if (!uri) {
    throw new Error("MONGO_URI is not defined.");
  }
  const connectedClient = await clientPromise;
  const db = connectedClient.db();
  return db.collection("action_items");
}

// ─────────────────────────────────────────────────────────────────────────
// GET /api/action-items - Fetch all tasks
// ─────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const collection = await getCollection();
    const docs = await collection.find({}).sort({ savedAt: -1 }).toArray();

    const tasks = docs.map((doc) => ({
      id: doc._id.toString(),
      task: doc.task || doc.description || "",
      deadline: doc.deadline || null,
      status: doc.status || "pending",
      savedAt: doc.savedAt ? new Date(doc.savedAt).toISOString() : null,
      client: doc.client || null,
    }));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching action items:", error);
    return NextResponse.json(
      { error: "Failed to fetch action items" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/action-items - Save tasks
// ─────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const collection = await getCollection();
    const now = new Date();

    let tasksToInsert: Array<{
      task: string;
      deadline: string | null;
      status: string;
      savedAt: Date;
      client?: string | null;
    }> = [];

    if (Array.isArray(body.actionItems) && body.actionItems.length > 0) {
      const deadline = body.deadline && typeof body.deadline === "string" ? body.deadline.trim() : null;
      const client = body.client && typeof body.client === "string" ? body.client.trim() : null;

      tasksToInsert = body.actionItems
        .filter((item: unknown) => typeof item === "string" && item.trim().length > 0)
        .map((item: string) => ({
          task: item.trim(),
          deadline: deadline || null,
          status: "pending",
          savedAt: now,
          client: client || null,
        }));
    } else if (body.task && typeof body.task === "string" && body.task.trim().length > 0) {
      tasksToInsert = [
        {
          task: body.task.trim(),
          deadline: body.deadline ? String(body.deadline).trim() : null,
          status: "pending",
          savedAt: now,
          client: body.client ? String(body.client).trim() : null,
        },
      ];
    }

    if (tasksToInsert.length === 0) {
      return NextResponse.json(
        { error: "No valid action items provided to save." },
        { status: 400 }
      );
    }

    const result = await collection.insertMany(tasksToInsert);

    return NextResponse.json(
      {
        success: true,
        insertedCount: result.insertedCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving action items:", error);
    return NextResponse.json(
      { error: "Failed to save action items" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PATCH /api/action-items - Update task status
// ─────────────────────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || typeof id !== "string" || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid or missing task ID." },
        { status: 400 }
      );
    }

    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid status value." },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const normalizedStatus = status.trim().toLowerCase();

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: normalizedStatus } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Action item not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
      status: normalizedStatus,
    });
  } catch (error) {
    console.error("Error updating action item:", error);
    return NextResponse.json(
      { error: "Failed to update action item" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// DELETE /api/action-items - Delete a task
// ─────────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id || typeof id !== "string" || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid or missing task ID." },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Action item not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (error) {
    console.error("Error deleting action item:", error);
    return NextResponse.json(
      { error: "Failed to delete action item" },
      { status: 500 }
    );
  }
}
