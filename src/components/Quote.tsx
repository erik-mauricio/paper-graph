type QuoteProps = {
  text: string
}

// A passage quoted from the paper.
function Quote({ text }: QuoteProps) {
  return (
    <blockquote className="max-w-prose border-l-2 border-base-300 pl-3 font-reading text-sm leading-relaxed italic text-base-content/70">
      “{text}”
    </blockquote>
  )
}

export default Quote
