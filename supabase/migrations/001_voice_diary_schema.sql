-- ═══════════════════════════════════════════════════
-- voice_diary 스키마 생성
-- WWVS 프로젝트(sfeyfxojkyjdbwpkvcdm) 내 격리 스키마
-- ═══════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS voice_diary;

-- ─── 권한 부여 (커스텀 스키마 필수) ───
GRANT USAGE ON SCHEMA voice_diary TO anon, authenticated;

-- ─── 1. 사용자 프로필 ───
CREATE TABLE IF NOT EXISTS voice_diary.profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid UNIQUE NOT NULL,
  name          text NOT NULL,
  birth_date    date,
  phone         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. 가족(보호자) 등록 ───
CREATE TABLE IF NOT EXISTS voice_diary.guardians (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES voice_diary.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  relation    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. 문항 마스터 ───
CREATE TABLE IF NOT EXISTS voice_diary.questions (
  id          serial PRIMARY KEY,
  category    text NOT NULL,
  content     text NOT NULL,
  is_common   boolean NOT NULL DEFAULT false,
  order_hint  int,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. 회원별 선택 문항 (29개) ───
CREATE TABLE IF NOT EXISTS voice_diary.user_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES voice_diary.profiles(id) ON DELETE CASCADE,
  question_id  int  NOT NULL REFERENCES voice_diary.questions(id),
  order_num    smallint NOT NULL,
  UNIQUE(user_id, question_id),
  UNIQUE(user_id, order_num)
);

-- ─── 5. 녹음 세션 ───
CREATE TABLE IF NOT EXISTS voice_diary.sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES voice_diary.profiles(id) ON DELETE CASCADE,
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  total_duration_sec int,
  avg_decibel       numeric(5,1),
  max_decibel       numeric(5,1),
  status            text NOT NULL DEFAULT 'in_progress'
);

-- ─── 6. 문항별 개별 녹음 ───
CREATE TABLE IF NOT EXISTS voice_diary.recordings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES voice_diary.sessions(id) ON DELETE CASCADE,
  question_id      int  NOT NULL REFERENCES voice_diary.questions(id),
  question_order   smallint NOT NULL,
  audio_url        text,
  duration_sec     int,
  max_decibel      numeric(5,1),
  avg_decibel      numeric(5,1),
  is_free_talk     boolean NOT NULL DEFAULT false,
  stt_text         text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── 7. 자유 이야기 블록 뷰 ───
CREATE VIEW voice_diary.free_talk_view AS
SELECT
  r.id             AS recording_id,
  r.session_id,
  s.user_id,
  s.recorded_at,
  r.duration_sec,
  r.audio_url,
  r.stt_text
FROM voice_diary.recordings r
JOIN voice_diary.sessions s ON s.id = r.session_id
WHERE r.is_free_talk = true
ORDER BY s.recorded_at DESC;

-- ─── 인덱스 ───
CREATE INDEX IF NOT EXISTS idx_sessions_user     ON voice_diary.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_sess   ON voice_diary.recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_user_questions_u  ON voice_diary.user_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_guardians_user    ON voice_diary.guardians(user_id);

-- ─── updated_at 자동 갱신 트리거 ───
CREATE OR REPLACE FUNCTION voice_diary.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON voice_diary.profiles
  FOR EACH ROW EXECUTE FUNCTION voice_diary.set_updated_at();

-- ─── 권한 부여 (테이블 생성 후) ───
GRANT SELECT, INSERT ON voice_diary.profiles        TO anon, authenticated;
GRANT SELECT, INSERT ON voice_diary.guardians       TO anon, authenticated;
GRANT SELECT          ON voice_diary.questions      TO anon, authenticated;
GRANT SELECT, INSERT  ON voice_diary.user_questions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON voice_diary.sessions TO anon, authenticated;
GRANT SELECT, INSERT  ON voice_diary.recordings     TO anon, authenticated;
GRANT SELECT          ON voice_diary.free_talk_view TO anon, authenticated;
GRANT UPDATE ON voice_diary.profiles  TO authenticated;
GRANT UPDATE ON voice_diary.sessions  TO authenticated;
GRANT DELETE ON voice_diary.guardians TO authenticated;

-- ─── RLS 활성화 ───
ALTER TABLE voice_diary.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_diary.guardians       ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_diary.user_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_diary.sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_diary.recordings      ENABLE ROW LEVEL SECURITY;

-- ─── RLS 정책 ───
CREATE POLICY "profiles_own" ON voice_diary.profiles
  FOR ALL USING (auth.uid() = auth_user_id);

CREATE POLICY "guardians_own" ON voice_diary.guardians
  FOR ALL USING (
    user_id IN (SELECT id FROM voice_diary.profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "uq_own" ON voice_diary.user_questions
  FOR ALL USING (
    user_id IN (SELECT id FROM voice_diary.profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "sessions_own" ON voice_diary.sessions
  FOR ALL USING (
    user_id IN (SELECT id FROM voice_diary.profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "sessions_family_read" ON voice_diary.sessions
  FOR SELECT USING (
    user_id IN (
      SELECT g.user_id FROM voice_diary.guardians g
      JOIN voice_diary.profiles p ON p.id = g.user_id
      WHERE g.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "recordings_own" ON voice_diary.recordings
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM voice_diary.sessions s
      JOIN voice_diary.profiles p ON p.id = s.user_id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "recordings_family_read" ON voice_diary.recordings
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM voice_diary.sessions s
      WHERE s.user_id IN (
        SELECT g.user_id FROM voice_diary.guardians g
        WHERE g.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- ─── 문항 시드 데이터 (70개) ───
INSERT INTO voice_diary.questions (category, content, is_common, order_hint) VALUES
('출생·고향','태어난 곳은 어디인가요?',false,1),
('출생·고향','자라난 동네 이름과 그곳의 기억을 이야기해 주세요.',false,2),
('출생·고향','어린 시절 살던 집을 묘사해 주세요.',false,3),
('출생·고향','고향에서 가장 좋아하던 장소는 어디인가요?',false,4),
('출생·고향','어린 시절 집 근처에 어떤 가게나 장소가 있었나요?',false,5),
('출생·고향','고향의 계절 풍경 중 가장 기억에 남는 것은?',false,6),
('출생·고향','고향 사투리나 독특한 표현이 있었나요?',false,7),
('출생·고향','처음으로 고향을 떠났을 때의 기억은?',false,8),
('학창시절','다니던 초등학교 이름은 무엇인가요?',false,1),
('학창시절','가장 좋아했던 선생님은 누구였나요?',false,2),
('학창시절','학창시절 가장 친했던 친구 이름은?',false,3),
('학창시절','학교에서 가장 잘했던 과목은 무엇인가요?',false,4),
('학창시절','학교 운동회나 소풍에서의 특별한 기억은?',false,5),
('학창시절','중학교 또는 고등학교 때 열심히 했던 것은?',false,6),
('학창시절','학창시절 받은 선물 중 가장 기억에 남는 것은?',false,7),
('학창시절','졸업식 날의 기억을 이야기해 주세요.',false,8),
('학창시절','학교 시험이나 발표에서 기억에 남는 순간은?',false,9),
('가족·부모님','어머니의 목소리나 말투가 기억나시나요?',false,1),
('가족·부모님','아버지에 대한 가장 오래된 기억은?',false,2),
('가족·부모님','형제자매는 몇 명이고 각자 어떤 사람이었나요?',false,3),
('가족·부모님','명절에 온 가족이 모여 하던 일은?',false,4),
('가족·부모님','부모님께 가장 혼났던 기억이 있다면?',false,5),
('가족·부모님','부모님이 자주 하시던 말씀이나 가르침은?',false,6),
('가족·부모님','어린 시절 가족이 함께한 가장 즐거운 기억은?',false,7),
('가족·부모님','형제자매와 함께했던 장난이나 추억은?',false,8),
('가족·부모님','할머니나 할아버지와의 기억이 있다면?',false,9),
('음식·추억','어린 시절 가장 좋아하던 음식은 무엇이었나요?',false,1),
('음식·추억','어머니가 해주시던 음식 중 가장 그리운 것은?',false,2),
('음식·추억','어릴 때 즐겨 부르던 노래나 동요는?',false,3),
('음식·추억','어린 시절 즐겨 하던 놀이는 무엇인가요?',false,4),
('음식·추억','처음으로 먹어본 특별한 음식의 기억은?',false,5),
('음식·추억','가장 기억에 남는 생일잔치는 언제였나요?',false,6),
('음식·추억','어릴 때 즐겨 읽던 책이나 만화가 있었나요?',false,7),
('음식·추억','어린 시절 가장 갖고 싶었던 물건은?',false,8),
('음식·추억','어릴 때 즐겨 보던 TV 프로그램이나 영화는?',false,9),
('결혼·가정','배우자를 처음 만난 날을 기억하시나요?',false,1),
('결혼·가정','결혼식 날의 기억을 이야기해 주세요.',false,2),
('결혼·가정','자녀 중 첫째가 태어난 날 기억나시나요?',false,3),
('결혼·가정','가족과 함께한 가장 행복한 여행은?',false,4),
('결혼·가정','결혼 후 처음 살던 집의 기억은?',false,5),
('결혼·가정','자녀를 키우면서 가장 뿌듯했던 순간은?',false,6),
('결혼·가정','가족과 함께 매년 챙기던 행사나 전통이 있었나요?',false,7),
('결혼·가정','배우자에게 가장 고마운 일은 무엇인가요?',false,8),
('결혼·가정','자녀에게 꼭 전하고 싶은 이야기가 있다면?',false,9),
('직업·성취','첫 직장은 어디였고 어떤 일을 했나요?',false,1),
('직업·성취','가장 자랑스러운 성취를 꼽는다면?',false,2),
('직업·성취','일하면서 가장 힘들었던 순간은 언제였나요?',false,3),
('직업·성취','직장에서 가장 오래 기억에 남는 동료는?',false,4),
('직업·성취','일을 통해 배운 가장 중요한 것은 무엇인가요?',false,5),
('직업·성취','젊은 시절 꿈꾸던 직업은 무엇이었나요?',false,6),
('직업·성취','평생 가장 보람을 느꼈던 일은 무엇인가요?',false,7),
('직업·성취','은퇴하던 날 또는 마지막 출근날의 기억은?',false,8),
('인생·가치관','살면서 가장 감사한 일은 무엇인가요?',false,1),
('인생·가치관','인생에서 가장 중요하게 여기는 것은?',false,2),
('인생·가치관','다시 산다면 어떤 일을 다르게 하고 싶나요?',false,3),
('인생·가치관','지금의 나에게 가장 큰 영향을 준 사람은?',false,4),
('인생·가치관','인생에서 가장 힘든 고비는 어떻게 넘겼나요?',false,5),
('인생·가치관','살면서 가장 용감하게 한 행동은?',false,6),
('인생·가치관','젊은 세대에게 꼭 전하고 싶은 말이 있다면?',false,7),
('인생·가치관','내 인생을 한 문장으로 표현한다면?',false,8),
('인생·가치관','가장 행복했던 시절은 언제였나요?',false,9),
('현재·일상','요즘 가장 즐거운 일은 무엇인가요?',false,1),
('현재·일상','요즘 즐겨 드시는 음식은 무엇인가요?',false,2),
('현재·일상','가장 자주 연락하는 사람은 누구인가요?',false,3),
('현재·일상','요즘 자주 가는 장소가 있다면?',false,4),
('현재·일상','요즘 관심을 갖고 있는 것은 무엇인가요?',false,5),
('현재·일상','하루 중 가장 좋아하는 시간대는?',false,6),
('현재·일상','지금 가장 보고 싶은 사람은 누구인가요?',false,7),
('현재·일상','요즘 즐겨 듣는 음악이나 좋아하는 노래는?',false,8),
('현재·일상','오늘 아침 무엇을 먹었고 어떤 하루였나요?',false,9),
('자유','지금 남기고 싶은 이야기를 편하게 자유롭게 말해 주세요.',true,1)
ON CONFLICT DO NOTHING;
