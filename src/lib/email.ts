const SERVICE_URL = "https://voice-diary-phi-two.vercel.app";
const LOGIN_URL = `${SERVICE_URL}/guardian-login`;

type GuardianInviteParams = {
  guardianEmail: string;
  guardianName: string;
  userEmail: string;
  generatedPassword: string;
};

export async function sendGuardianInviteEmail({
  guardianEmail,
  guardianName,
  userEmail,
  generatedPassword,
}: GuardianInviteParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@voice-diary.app";

  // 개발 환경 (RESEND_API_KEY 없음): 콘솔에 출력만 하고 성공 처리
  if (!apiKey) {
    console.log("\n========== 보호자 초대 메일 (개발 환경 — 실제 발송 안됨) ==========");
    console.log(`받는 사람  : ${guardianEmail} (${guardianName})`);
    console.log(`사용자 이메일: ${userEmail}`);
    console.log(`임시 비밀번호: ${generatedPassword}`);
    console.log(`로그인 URL : ${LOGIN_URL}`);
    console.log("================================================================\n");
    return { ok: true };
  }

  const displayName = guardianName || guardianEmail;
  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Apple SD Gothic Neo',sans-serif;color:#1c1917;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:linear-gradient(135deg,#ea580c,#f97316);padding:32px 28px;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;letter-spacing:-0.5px;">기억을 꼭 붙잡아!!</h1>
    <p style="color:rgba(255,255,255,0.88);margin:6px 0 0;font-size:13px;">찬란했던 나의 이야기</p>
  </div>

  <div style="padding:28px 28px 0;">
    <p style="font-size:15px;margin:0 0 6px;"><strong>${displayName}</strong>님, 안녕하세요.</p>

    <div style="background:#fff7ed;border-left:4px solid #ea580c;border-radius:6px;padding:14px 16px;margin:20px 0;">
      <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:#9a3412;">서비스 소개</p>
      <p style="margin:0;font-size:13px;color:#57534e;line-height:1.6;">
        <strong>기억을 꼭 붙잡아!!</strong>는 치매 예방과 생애 기억 보존을 위한 음성 녹음 서비스입니다.<br>
        소중한 분의 목소리로 기록된 인생 이야기를 언제든 다시 들을 수 있습니다.<br>
        <a href="${SERVICE_URL}" style="color:#ea580c;">${SERVICE_URL}</a>
      </p>
    </div>

    <p style="font-size:14px;line-height:1.7;color:#374151;">
      <strong>${userEmail}</strong> 계정 사용자께서<br>
      <strong>${displayName}</strong>님을 <strong>보호자</strong>로 등록하셨습니다.<br>
      이제 귀하는 해당 사용자의 음성 녹음 기록을 열람하실 수 있습니다.
    </p>
  </div>

  <div style="margin:20px 28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;">
    <p style="margin:0 0 14px;font-weight:700;font-size:14px;color:#1e293b;">🔐 보호자 로그인 정보</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr>
        <td style="padding:7px 0;color:#64748b;width:38%;">로그인 페이지</td>
        <td><a href="${LOGIN_URL}" style="color:#ea580c;font-weight:600;">${LOGIN_URL}</a></td>
      </tr>
      <tr style="border-top:1px solid #f1f5f9;">
        <td style="padding:7px 0;color:#64748b;">사용자 이메일</td>
        <td style="font-weight:600;">${userEmail}</td>
      </tr>
      <tr style="border-top:1px solid #f1f5f9;">
        <td style="padding:7px 0;color:#64748b;">보호자 이메일</td>
        <td style="font-weight:600;">${guardianEmail}</td>
      </tr>
      <tr style="border-top:1px solid #f1f5f9;">
        <td style="padding:7px 0;color:#64748b;">임시 비밀번호</td>
        <td style="font-weight:800;font-size:16px;color:#ea580c;letter-spacing:1.5px;">${generatedPassword}</td>
      </tr>
    </table>
  </div>

  <div style="margin:0 28px 24px;background:#fef2f2;border-radius:8px;padding:12px 16px;">
    <p style="margin:0;font-size:12px;color:#7f1d1d;line-height:1.6;">
      ⚠️ 위 로그인 정보는 안전하게 보관해 주세요.<br>
      보호자 계정으로는 <strong>음성 녹음 기능을 사용할 수 없으며, 녹음 열람만 가능</strong>합니다.
    </p>
  </div>

  <div style="background:#f1f5f9;padding:16px 28px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
      이 메일은 기억을 꼭 붙잡아!! 서비스에서 자동 발송되었습니다.<br>
      © 2026 Young Sohk Song (宋映錫 · 송영석). All rights reserved.
    </p>
  </div>

</div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [guardianEmail],
        subject: `[기억을 꼭 붙잡아!!] ${userEmail} 님이 당신을 보호자로 등록했습니다`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error("[voice-diary] 보호자 메일 발송 실패:", err);
      return { ok: false, error: "안내 메일 발송에 실패했습니다. 보호자에게 직접 로그인 정보를 전달해 주세요." };
    }

    return { ok: true };
  } catch (e) {
    console.error("[voice-diary] 보호자 메일 발송 예외:", e);
    return { ok: false, error: "메일 발송 중 오류가 발생했습니다." };
  }
}
