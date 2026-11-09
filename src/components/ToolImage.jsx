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
