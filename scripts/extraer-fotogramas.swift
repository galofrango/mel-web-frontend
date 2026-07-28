import AVFoundation
import AppKit

let url = URL(fileURLWithPath: CommandLine.arguments[1])
let outDir = CommandLine.arguments[2]
let asset = AVURLAsset(url: url)
let dur = CMTimeGetSeconds(asset.duration)
let track = asset.tracks(withMediaType: .video).first
print("duracion: \(String(format: "%.2f", dur))s  tamano: \(track?.naturalSize ?? .zero)")

let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 500, height: 1100)

let n = Int(CommandLine.arguments[3]) ?? 20
for i in 0..<n {
    let t = dur * Double(i) / Double(n - 1)
    let time = CMTime(seconds: min(t, dur - 0.05), preferredTimescale: 600)
    guard let cg = try? gen.copyCGImage(at: time, actualTime: nil) else { print("fallo en \(t)"); continue }
    let rep = NSBitmapImageRep(cgImage: cg)
    guard let data = rep.representation(using: .png, properties: [:]) else { continue }
    let name = String(format: "%@/f%02d_%.2fs.png", outDir, i, t)
    try? data.write(to: URL(fileURLWithPath: name))
}
print("listo")
