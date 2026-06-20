import Vision
import AppKit

let args = CommandLine.arguments
let imagePath = args.count > 1 ? args[1] : "/tmp/linearcue_screen.png"

guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    exit(1)
}

let request = VNRecognizeTextRequest { request, error in
    guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
    for obs in observations {
        if let text = obs.topCandidates(1).first?.string {
            print(text)
        }
    }
}

request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage)
try? handler.perform([request])
