// 이미지가 있으면 파일명과 함께 표시하고, 없으면 선택 안내를 표시하는 공통 뷰어입니다.
// Tool 이미지 컴포넌트
export default function ToolImage({ image }) {
  return (
    <div className="image-placeholder">
      {image ? (
        <>
          <img
            src={image.url}
            alt={image.name}
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "contain",
              borderRadius: 10,
            }}
          />
          <span style={{ overflowWrap: "anywhere" }}>{image.name}</span>
        </>
      ) : (
        <span>현재 Set의 이미지 폴더를 선택해주세요.</span>
      )}
    </div>
  );
}
