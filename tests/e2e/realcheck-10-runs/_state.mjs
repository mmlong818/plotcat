import {DatabaseSync} from 'node:sqlite';
const db=new DatabaseSync('./data/yuandian.db');
const titles=['闪婚豪门','重生 1999','九重霜','南门外的录像厅'];
for(const t of titles){
  const m=db.prepare('SELECT id,title,format FROM projects WHERE title=?').get(t);
  if(!m){console.log(t,'NOT FOUND');continue;}
  const sc=db.prepare("SELECT COUNT(*) c,SUM(LENGTH(COALESCE(script_full,''))) total,MIN(LENGTH(COALESCE(script_full,''))) mn FROM scene_cards WHERE project_id=?").get(m.id);
  console.log(m.id,'|',m.title,'|',m.format,'|','scenes='+(sc.c||0),'total='+(sc.total||0),'min='+(sc.mn||0));
}
