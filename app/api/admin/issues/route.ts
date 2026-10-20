import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
export async function POST(request:Request){
 const admin=await requireAdmin();if(!admin)return NextResponse.redirect(new URL("/login",request.url));
 const form=await request.formData();const id=String(form.get("id")||"");const status=String(form.get("status")||"");
 if(!id||!["OPEN","RESOLVED"].includes(status))return NextResponse.json({error:"Données invalides."},{status:400});
 const row=await prisma.auditLog.findFirst({where:{id,action:"USER_ISSUE_REPORTED",entity:"SUPPORT_REPORT"}});
 if(!row)return NextResponse.json({error:"Signalement introuvable."},{status:404});
 const metadata=(row.metadata??{}) as Record<string,unknown>;
 await prisma.auditLog.update({where:{id},data:{metadata:{...metadata,status,reviewedBy:admin.id,reviewedAt:new Date().toISOString()}}});
 return NextResponse.redirect(new URL("/admin/issues",request.url),303);
}