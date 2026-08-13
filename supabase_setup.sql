-- SNI Center 대기열 실시간 동기화용 테이블
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요.

create table if not exists waiting_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id text not null,
  branch_name text not null,
  branch_type text not null default 'general',
  purpose text not null,
  avg_service_min int not null default 10,
  status text not null default 'waiting', -- waiting | done | cancelled
  created_at timestamptz not null default now(),
  consult_note text, -- 고객이 대기 중 투자 대시보드에서 남긴 상담 요청 사항, PB 업무 탭에 실시간으로 표시됨
  customer_name text -- 대기 등록 시 고객이 직접 입력한 이름, PB 업무 탭에 실시간으로 표시됨
);

-- 이미 만든 테이블에 나중에 컬럼만 추가하는 경우 이 두 줄만 실행해도 됩니다.
alter table waiting_entries add column if not exists consult_note text;
alter table waiting_entries add column if not exists customer_name text;

alter table waiting_entries enable row level security;

-- 프로토타입이라 로그인 없이 누구나 읽고/등록하고/상태를 바꿀 수 있게 허용합니다.
-- (실서비스라면 지점 직원 인증 등으로 update/insert 권한을 좁혀야 합니다.)
create policy "anyone can read" on waiting_entries
  for select using (true);

create policy "anyone can insert" on waiting_entries
  for insert with check (true);

create policy "anyone can update" on waiting_entries
  for update using (true);

-- 실시간(Realtime) 브로드캐스트를 위해 publication에 테이블을 추가합니다.
alter publication supabase_realtime add table waiting_entries;
