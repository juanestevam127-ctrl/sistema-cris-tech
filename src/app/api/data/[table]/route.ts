import { NextRequest, NextResponse } from "next/server";
import { nocodb, NocoTableName } from "@/lib/nocodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const tableName = table as NocoTableName;

    const { searchParams } = new URL(request.url);
    const where = searchParams.get("where") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;
    const sort = searchParams.get("sort") || undefined;

    const data = await nocodb.findMany(tableName, { where, limit, offset, sort });
    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    console.error(`Erro GET /api/data/${(await params).table}:`, error);
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const tableName = table as NocoTableName;
    const body = await request.json();

    const data = await nocodb.insert(tableName, body);
    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    console.error(`Erro POST /api/data/${(await params).table}:`, error);
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const tableName = table as NocoTableName;
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ data: null, error: "ID é obrigatório para atualização." }, { status: 400 });
    }

    const data = await nocodb.update(tableName, id, updateData);
    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    console.error(`Erro PATCH /api/data/${(await params).table}:`, error);
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    const tableName = table as NocoTableName;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ data: null, error: "ID é obrigatório para exclusão." }, { status: 400 });
    }

    await nocodb.delete(tableName, id);
    return NextResponse.json({ success: true, error: null });
  } catch (error: any) {
    console.error(`Erro DELETE /api/data/${(await params).table}:`, error);
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}
