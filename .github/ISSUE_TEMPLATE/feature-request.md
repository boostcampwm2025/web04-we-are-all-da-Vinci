name: "Feature"
description: "새로운 기능 또는 명세가 있나요?"
labels: "Feature"
body:

- type: textarea
  attributes:
  label: Describe
  description: 새로운 기능에 대한 설명을 작성해 주세요.
  placeholder: 자세히 적을수록 좋습니다!
  validations:
  required: true
- type: textarea
  attributes:
  label: Tasks
  description: 해야 하는 일에 대한 Tasks를 작성해 주세요.
  placeholder: 최대한 세분화 해서 적어주세요!
  validations:
  required: true
- type: textarea
  attributes:
  label: More
  description: 더 하고 싶은 말이 있다면 작성해 주세요.