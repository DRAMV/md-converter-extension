// utils/image-analyzer.js
// Selects the optimal Gemini prompt per image subtype

const IMAGE_PROMPTS = {

  screenshot: `You are an expert document converter.
Analyse this screenshot carefully and convert ALL visible content to clean, well-structured Markdown.
Rules:
- Preserve every heading level (h1→#, h2→##, etc.)
- Convert all lists (bullet and numbered) accurately
- Convert any visible tables to Markdown table format
- Wrap any code, commands, or technical strings in backtick code blocks with the correct language tag
- Preserve links if visible as [text](url)
- Preserve bold and italic emphasis
- Remove browser UI, toolbars, scrollbars — content only
Output only the Markdown. No preamble, no explanation.`,

  scanned_document: `You are an expert OCR and document converter.
This is a scanned physical document. Extract ALL text with high accuracy.
Rules:
- Reconstruct the original document structure with correct heading hierarchy
- Preserve paragraph breaks as they appear in the document
- Convert any visible tables to Markdown table format
- If you see form fields, render them as: **Field name:** value
- Correct obvious scan artefacts (broken words, stray characters) where safe
- Preserve any numbered or bulleted lists
- If text is unclear, use [illegible] as a placeholder
Output only the Markdown. No preamble, no explanation.`,

  handwriting: `You are an expert handwriting transcription specialist.
Transcribe ALL handwritten text in this image as accurately as possible.
Rules:
- Preserve the original structure — headings, lists, paragraphs
- If text is ambiguous, make your best inference and note it with (?)
- Convert drawn tables or grids to Markdown table format
- Preserve any arrows or connectors as prose descriptions (e.g. "→ leads to")
- Use [illegible] for sections that cannot be read
Output only the Markdown transcription. No preamble, no explanation.`,

  table: `You are an expert data extraction specialist.
This image contains a table or structured data. Extract it with perfect accuracy.
Rules:
- Convert the table to proper Markdown table format with aligned columns
- Preserve all headers exactly
- Preserve all cell values — numbers, text, units
- If there are multiple tables, separate them with a heading and a blank line
- If there are notes or footnotes below the table, include them after
- Do not add or infer any data not visible in the image
Output only the Markdown table(s). No preamble, no explanation.`,

  chart: `You are an expert data analyst and document converter.
This image contains a chart or graph. Describe and extract its content into Markdown.
Rules:
- Start with a ## heading using the chart title if visible
- Write a 1-2 sentence description of what the chart shows
- Extract the underlying data into a Markdown table if values are readable
- Note the chart type (bar, line, pie, etc.)
- Note the axis labels and units
- Highlight any key trends or notable data points in a brief bullet list
Output only the Markdown. No preamble, no explanation.`,

  diagram: `You are an expert technical writer and diagram analyst.
This image contains a diagram, flowchart, or architecture drawing.
Rules:
- Start with a ## heading using the diagram title if visible
- Write a clear prose description of what the diagram shows
- List all nodes/components as a bullet list with their labels
- Describe the connections/flow between components
- If there are labels on arrows, include them
- Preserve any legend or key information
Output only the Markdown. No preamble, no explanation.`,

  slide: `You are an expert presentation converter.
This is a presentation slide. Extract all content to Markdown.
Rules:
- Use ## for the slide title
- Use bullet points for slide body content exactly as shown
- Preserve any sub-bullets with proper indentation (  -)
- Include any speaker notes if visible, under a **Notes:** heading
- Include any visible chart or table data
- Preserve emphasis (bold, italic) as shown
Output only the Markdown. No preamble, no explanation.`,

  receipt: `You are an expert document data extractor.
This is a receipt, invoice, or financial document. Extract all data accurately.
Rules:
- Start with ## and the document type (Receipt / Invoice / Bill)
- Extract merchant/vendor name, date, and reference number as bold fields
- Convert all line items to a Markdown table: | Item | Qty | Price |
- Include subtotal, tax, discounts, and total as separate bold lines
- Include any terms, notes, or payment info at the bottom
Output only the Markdown. No preamble, no explanation.`,

  document_page: `You are an expert document converter.
This is a page from a document or book. Convert it to clean Markdown.
Rules:
- Preserve the heading hierarchy exactly
- Preserve all paragraph text with correct line breaks
- Convert any tables to Markdown table format
- Preserve footnotes at the bottom with superscript markers as [^1]
- Preserve page numbers as <!-- page N --> comments
- Wrap any inline code or technical terms in backticks
Output only the Markdown. No preamble, no explanation.`,

  photo: `You are an expert image analyst and document converter.
Analyse this image and extract any visible text or structured information.
Rules:
- Extract all visible text accurately
- If the image contains a document, form, or label — structure it as Markdown
- If the image is a scene or object with minimal text — describe it briefly in Markdown
- Use headings and lists where appropriate
Output only the Markdown. No preamble, no explanation.`,

  banner: `You are an expert content extractor.
Extract all text and content from this banner or wide image.
Rules:
- Extract all visible text in reading order
- Preserve any headings or taglines as ## headings
- List any bullet points or features as a Markdown list
- Include any visible URLs, contact info, or CTAs
Output only the Markdown. No preamble, no explanation.`

};

function getImagePrompt(subtype) {
  return IMAGE_PROMPTS[subtype] || IMAGE_PROMPTS["screenshot"];
}