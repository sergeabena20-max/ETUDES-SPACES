import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
const schema=z.object({category:z.enum(["BUG","CONTENT","ACCOUNT","SUGGESTION","OTHER"]),message:z.string().trim().min(8,"Décris le problème en au moins 8 caractères.").max(2000),email:z.union([z.literal(""),z.string().trim().email().max(254)]).optional()});
export async function POST(request:Request){
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Données invalides."},{status:400});
 const user=await getCurrentUser();
 const report=await prisma.auditLog.create({data:{actorId:user?.id??null,action:"USER_ISSUE_REPORTED",entity:"SUPPORT_REPORT",metadata:{category:parsed.data.category,message:parsed.data.message,contactEmail:parsed.data.email||null,status:"OPEN",reporterName:user?[user.firstName,user.lastName].filter(Boolean).join(" "):null,reporterEmail:user?.email??(parsed.data.email||null)}},select:{id:true}});
 return NextResponse.json({ok:true,id:report.id},{status:201});
}