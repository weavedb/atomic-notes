const circleNotch = (
  <svg
    viewBox="0 0 100 100"
    width="20"
    height="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="50"
      cy="50"
      r="45"
      stroke="black"
      stroke-width="10"
      fill="none"
      stroke-dasharray="283"
      stroke-dashoffset="75"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 50 50"
        to="360 50 50"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
)

export { circleNotch }
