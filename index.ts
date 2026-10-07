import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
serve(async req=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 try{
  const auth=req.headers.get('Authorization'); if(!auth) throw new Error('Unauthorized');
  const body=await req.json(); const {exam_id,exam_form_id,student_name,student_class,answers}=body;
  if(!exam_id||!exam_form_id||!student_name||!student_class||!Array.isArray(answers)) throw new Error('Dữ liệu không hợp lệ');
  const url=Deno.env.get('SUPABASE_URL')!, key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; const db=createClient(url,key);
  const {data:exam,error:ee}=await db.from('exams').select('*').eq('id',exam_id).single(); if(ee||!exam||!exam.is_published) throw new Error('Bài không còn mở');
  if(exam.attempt_limit>0){const {count}=await db.from('attempts').select('id',{count:'exact',head:true}).eq('exam_id',exam_id).ilike('student_name',student_name.trim()).ilike('student_class',student_class.trim());if((count||0)>=exam.attempt_limit)throw new Error('Bạn đã đạt giới hạn số lần làm bài.');}
  const {data:eq}=await db.from('exam_questions').select('question_id,questions(answer_index)').eq('exam_form_id',exam_form_id).order('position');
  if(!eq?.length) throw new Error('Mã đề không có câu hỏi');
  const amap=new Map(answers.map((a:any)=>[a.question_id,a.chosen_index])); let correct=0; const details:any[]=[];
  for(const x of eq){const chosen=amap.has(x.question_id)?amap.get(x.question_id):null;const ci=x.questions.answer_index;const ok=chosen!==null&&chosen===ci;if(ok)correct++;details.push({question_id:x.question_id,chosen_index:chosen,correct_index:ci,is_correct:ok});}
  const total=eq.length,score=total?Math.round(correct/total*1000)/100:0;
  const {data:attempt,error:ae}=await db.from('attempts').insert({exam_id,exam_form_id,student_name:student_name.trim(),student_class:student_class.trim(),score,total_correct:correct,total_questions:total}).select().single();if(ae)throw ae;
  const {error:ane}=await db.from('attempt_answers').insert(details.map(d=>({...d,attempt_id:attempt.id})));if(ane)throw ane;
  return new Response(JSON.stringify({score,correct,total,attempt_id:attempt.id}),{headers:{...cors,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({error:String(e?.message||e)}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}
});
