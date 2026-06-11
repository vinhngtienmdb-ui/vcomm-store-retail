export interface VnBank {
  bin: string;
  shortName: string;
  name: string;
}

export const VN_BANKS: VnBank[] = [
  { bin: "970436", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại thương Việt Nam" },
  { bin: "970415", shortName: "VietinBank", name: "Ngân hàng TMCP Công thương Việt Nam" },
  { bin: "970418", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  { bin: "970405", shortName: "Agribank", name: "Ngân hàng Nông nghiệp và PTNT Việt Nam" },
  { bin: "970407", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam" },
  { bin: "970422", shortName: "MB Bank", name: "Ngân hàng TMCP Quân đội" },
  { bin: "970432", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { bin: "970423", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong" },
  { bin: "970403", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương tín" },
  { bin: "970416", shortName: "ACB", name: "Ngân hàng TMCP Á Châu" },
  { bin: "970437", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển TP.HCM" },
  { bin: "970448", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông" },
  { bin: "970454", shortName: "Viet Capital Bank", name: "Ngân hàng TMCP Bản Việt" },
  { bin: "970441", shortName: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { bin: "970443", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { bin: "970426", shortName: "MSB", name: "Ngân hàng TMCP Hàng hải" },
  { bin: "970406", shortName: "DongA Bank", name: "Ngân hàng TMCP Đông Á" },
  { bin: "970440", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á" },
  { bin: "970431", shortName: "Eximbank", name: "Ngân hàng TMCP Xuất nhập khẩu Việt Nam" },
  { bin: "970438", shortName: "Bao Viet Bank", name: "Ngân hàng TMCP Bảo Việt" },
  { bin: "970428", shortName: "NamABank", name: "Ngân hàng TMCP Nam Á" },
  { bin: "970419", shortName: "NCB", name: "Ngân hàng TMCP Quốc Dân" },
  { bin: "970425", shortName: "ABBANK", name: "Ngân hàng TMCP An Bình" },
  { bin: "970452", shortName: "KienLongBank", name: "Ngân hàng TMCP Kiên Long" },
  { bin: "970433", shortName: "VietBank", name: "Ngân hàng TMCP Việt Nam Thương Tín" },
  { bin: "970409", shortName: "BacABank", name: "Ngân hàng TMCP Bắc Á" },
  { bin: "970424", shortName: "Shinhan Bank", name: "Ngân hàng Shinhan Việt Nam" },
  { bin: "970442", shortName: "Hong Leong Bank", name: "Ngân hàng Hong Leong Việt Nam" },
  { bin: "970458", shortName: "United Overseas Bank", name: "Ngân hàng UOB Việt Nam" },
  { bin: "970444", shortName: "CBBank", name: "Ngân hàng Xây dựng Việt Nam" },
];

export function findBankByBin(bin: string | undefined | null): VnBank | undefined {
  if (!bin) return undefined;
  return VN_BANKS.find((b) => b.bin === bin);
}
