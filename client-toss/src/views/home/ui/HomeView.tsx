import { useLoginFlow } from "@/feature/login";
import { serverTossApi } from "@/shared/api";
import { getDeviceId } from "@apps-in-toss/web-framework";
import { Button, Top } from "@toss/tds-mobile";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const HomeView = () => {
  const navigate = useNavigate();
  const { handleLogout } = useLoginFlow();
  const [isLoading, setIsLoading] = useState(true);
  const [anonymousHash, setAnonymousHash] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(
    async (hash: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const { promptId, strokes } = await serverTossApi.getPrompt();
        console.log("[Home] prompt loaded:", {
          promptId,
          strokeCount: strokes.length,
          sampleStroke: strokes[0],
        });
        navigate("/memorize", {
          state: { promptId, promptStrokes: strokes, anonymousHash: hash },
          replace: true,
        });
      } catch (err) {
        console.error("프롬프트 로드 실패:", err);
        setError("서버에 연결할 수 없어요. 다시 시도해주세요.");
        setIsLoading(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    const init = async () => {
      let hash: string;
      try {
        const { deviceId } = await getDeviceId();
        hash = deviceId;
      } catch {
        hash = "local";
      }
      setAnonymousHash(hash);

      const today = new Date().toISOString().slice(0, 10);
      const lastPlayed = localStorage.getItem(`lastPlayed_${hash}`);

      if (lastPlayed === today) {
        setIsLoading(false);
        return;
      }

      await startGame(hash);
    };

    init();
  }, [startGame]);

  if (isLoading && !error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-(--color-grey)">준비 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-(--page-px)">
        <p className="text-center text-(--color-grey)">{error}</p>
        <Button
          size="large"
          onClick={() => anonymousHash && startGame(anonymousHash)}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Top
        className="p-4"
        title={
          <Top.TitleParagraph size={28}>
            오늘의 드로잉 챌린지
          </Top.TitleParagraph>
        }
        subtitleBottom={
          <Top.SubtitleParagraph>
            기억력으로 그림을 따라 그려보세요!
          </Top.SubtitleParagraph>
        }
      />

      <div className="flex flex-1 flex-col gap-3 px-(--page-px) pt-4">
        <Button
          size="xlarge"
          display="block"
          onClick={() => anonymousHash && startGame(anonymousHash)}
        >
          다시 도전하기
        </Button>
        <Button
          size="xlarge"
          variant="weak"
          display="block"
          onClick={() => navigate("/dashboard")}
        >
          결과 보기
        </Button>
        <Button
          size="xlarge"
          variant="weak"
          display="block"
          onClick={() => navigate("/ranking")}
        >
          랭킹 보기
        </Button>
        <Link to="/login">
          <Button size="large" display="block">
            로그인 페이지로 이동
          </Button>
        </Link>
        <Button size="large" display="block" onClick={handleLogout}>
          로그아웃 (토큰 삭제)
        </Button>
      </div>
    </div>
  );
};

export default HomeView;
