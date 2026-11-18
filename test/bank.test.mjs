import test from 'node:test';
import assert from 'node:assert/strict';
import { GRADES, SUBJECTS, generateQuestions } from '../src/bank.js';

test('every level and subject sustains 11 fifty-question matches without a repeat',()=>{
  for (const {id:grade} of GRADES) for (const {id:subject} of SUBJECTS) {
    const ids = new Set(), prompts = new Set();
    for(let round=0;round<11;round++){
      const batch=generateQuestions({grade,subject,count:50,excludeIds:ids});
      assert.equal(batch.length,50);
      for (const item of batch) {
        assert(!ids.has(item.id),item.id);
        assert(!prompts.has(item.subject+':'+item.prompt),grade+'/'+subject+' '+item.prompt);
        assert.equal(new Set(item.options).size,4);
        assert(item.answer>=0&&item.answer<=3);
        assert(item.options.every(x=>typeof x==='string'&&x.length>0));
        assert(!item.prompt.includes('undefined'));
        assert(subject==='mix'||item.subject===subject);
        ids.add(item.id);
        prompts.add(item.subject+':'+item.prompt);
      }
      if(subject==='mix')assert.equal(new Set(batch.map(x=>x.subject)).size,SUBJECTS.length-1);
    }
  }
});
test('ranking, two-condition tables and precedence match their independent answer keys',()=>{
  const batch=generateQuestions({grade:'8',subject:'informatika',count:50});
  for(const question of batch){
    const correct=question.options[question.answer], p=question.prompt;
    if(question.source==='bebras-kondisi'){
      const limit=Number(p.match(/< (\d+)/)[1]);
      const eligible=[...p.matchAll(/([A-Z][a-z]{2}): (cerah|hujan)\/(\d+)\/(kosong|dipakai)/g)].filter(m=>m[2]==='cerah'&&Number(m[3])<limit&&m[4]==='kosong');
      assert.equal(eligible.length,1);assert.equal(eligible[0][1],correct);
    }
    if(question.source==='bebras-danau'){
      const nums=[...p.matchAll(/\((\d+),(\d+)\)/g)].map(m=>[Number(m[1]),Number(m[2])]);
      assert.equal(Number(correct),Math.abs(nums[0][0]-nums[1][0])+Math.abs(nums[0][1]-nums[1][1]));
    }
    if(question.source==='bebras-kemping'){
      const [shelf,used]=p.slice('Rak dari kiri: '.length).split('. ');
      const moved=used.split(' dipindah')[0].split(' dan ');
      assert.equal(correct,shelf.split(', ').filter(x=>!moved.includes(x)).at(-1));
    }
  }
});
test('rejects invalid settings',()=>{
  for (const input of [{grade:'lain'},{count:0},{subject:'x'},{count:51},{count:2.5}])
    assert.throws(()=>generateQuestions(input),RangeError);
});
