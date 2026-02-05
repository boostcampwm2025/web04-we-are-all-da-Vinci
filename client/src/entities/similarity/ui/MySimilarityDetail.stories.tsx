import type { Meta, StoryObj } from '@storybook/react-vite';
import MySimilarityDetail from './MySimilarityDetail';

const meta = {
  title: 'entities/similarity/내 유사도 상세 (MySimilarityDetail)',
  component: MySimilarityDetail,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '내 유사도 분석 결과를 표시하는 컴포넌트입니다. 모바일에서는 3컬럼 그리드로, 데스크탑에서는 스택형 프로그레스 바로 표시됩니다.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80 md:w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MySimilarityDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: '기본 상태',
  args: {
    similarity: {
      similarity: 75,
      strokeCountSimilarity: 10,
      strokeMatchSimilarity: 50,
      shapeSimilarity: 15,
    },
  },
};

export const HighSimilarity: Story = {
  name: '높은 유사도',
  args: {
    similarity: {
      similarity: 95,
      strokeCountSimilarity: 50,
      strokeMatchSimilarity: 40,
      shapeSimilarity: 5,
    },
  },
  parameters: {
    docs: {
      description: {
        story: '모든 지표가 90% 이상인 경우',
      },
    },
  },
};

export const LowSimilarity: Story = {
  name: '낮은 유사도',
  args: {
    similarity: {
      similarity: 25,
      strokeCountSimilarity: 6.5,
      strokeMatchSimilarity: 7.5,
      shapeSimilarity: 11,
    },
  },
  parameters: {
    docs: {
      description: {
        story: '모든 지표가 30% 이하인 경우',
      },
    },
  },
};

export const UnevenDistribution: Story = {
  name: '불균등 분포',
  args: {
    similarity: {
      similarity: 80,
      strokeCountSimilarity: 10,
      strokeMatchSimilarity: 50,
      shapeSimilarity: 10,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          '각 지표의 값이 크게 다른 경우 - 스택형 바에서 비율 차이가 명확하게 표시됩니다.',
      },
    },
  },
};

export const ZeroSimilarity: Story = {
  name: '유사도 0%',
  args: {
    similarity: {
      similarity: 0,
      strokeCountSimilarity: 0,
      strokeMatchSimilarity: 0,
      shapeSimilarity: 0,
    },
  },
  parameters: {
    docs: {
      description: {
        story: '모든 지표가 0인 경우 (edge case)',
      },
    },
  },
};

export const PerfectSimilarity: Story = {
  name: '완벽한 유사도 (100%)',
  args: {
    similarity: {
      similarity: 100,
      strokeCountSimilarity: 10,
      strokeMatchSimilarity: 50,
      shapeSimilarity: 40,
    },
  },
  parameters: {
    docs: {
      description: {
        story: '모든 지표가 100%인 경우',
      },
    },
  },
};
