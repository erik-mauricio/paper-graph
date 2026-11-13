type QuoteProps = {
  text: string
}

// A passage quoted from the paper.
function Quote({ text }: QuoteProps) {
  return (
    <blockquote className="border-l-2 border-base-300 pl-3 text-sm italic text-base-content/70">
      “{text}”
    </blockquote>
  )
}

export default Quote
