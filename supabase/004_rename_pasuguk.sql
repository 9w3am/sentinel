-- 004 — 조직 이름을 파수국으로 바꾼다 (이미 schema.sql 을 실행한 경우에만)
update public.pages set title = replace(title, '센티넬 협회', '파수국'),
  body = replace(replace(body, '센티넬 협회', '파수국'), '협회 게시판', '게시판')
where slug = 'rules';
