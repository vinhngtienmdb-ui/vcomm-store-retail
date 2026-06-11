import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { LogOut, UserCog, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminUserMenu() {
  const { user, logout, refresh } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");

  const openProfile = () => {
    setProfileName(user?.name ?? "");
    setProfileEmail(user?.email ?? "");
    setProfilePhone(user?.phone ?? "");
    setProfileOpen(true);
  };
  const openPwd = () => {
    setPwdCurrent("");
    setPwdNew("");
    setPwdConfirm("");
    setPwdOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (body: { name: string; email: string; phone: string }) => {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không cập nhật được");
      }
      return res.json();
    },
    onSuccess: async () => {
      await refresh();
      toast({ title: "Đã cập nhật hồ sơ" });
      setProfileOpen(false);
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (body: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không đổi được mật khẩu");
      }
      return res.json();
    },
    onSuccess: () => {
      setPwdOpen(false);
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      toast({
        title: "Đã đổi mật khẩu",
        description: "Lần sau hãy đăng nhập với mật khẩu mới.",
      });
    },
    onError: (err) =>
      toast({ title: "Lỗi", description: (err as Error).message, variant: "destructive" }),
  });

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 shrink-0 px-2"
            data-testid="button-admin-user-menu"
          >
            <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium leading-none">{user.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Quản trị nền tảng</div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            <Badge className="mt-1" variant="secondary">
              <ShieldCheck className="w-3 h-3 mr-1" /> Quản trị nền tảng
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openProfile} data-testid="button-edit-profile">
            <UserCog className="mr-2 h-4 w-4" /> Cập nhật hồ sơ
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openPwd} data-testid="button-change-password">
            <Lock className="mr-2 h-4 w-4" /> Đổi mật khẩu
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive"
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" /> Cập nhật hồ sơ
            </DialogTitle>
            <DialogDescription>
              Thay đổi tên hiển thị, email đăng nhập và số điện thoại của tài khoản quản trị.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate({
                name: profileName.trim(),
                email: profileEmail.trim(),
                phone: profilePhone.trim(),
              });
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="admin-profile-name">Tên hiển thị</Label>
              <Input
                id="admin-profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                maxLength={120}
                data-testid="input-profile-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-profile-email">Email đăng nhập</Label>
              <Input
                id="admin-profile-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                required
                maxLength={160}
                data-testid="input-profile-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-profile-phone">Số điện thoại</Label>
              <Input
                id="admin-profile-phone"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                maxLength={40}
                data-testid="input-profile-phone"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  !profileName.trim() ||
                  !profileEmail.trim() ||
                  updateProfileMutation.isPending
                }
                data-testid="button-save-profile"
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Đổi mật khẩu
            </DialogTitle>
            <DialogDescription>
              Nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 6 ký tự). Sau khi đổi, mọi
              thiết bị khác đang đăng nhập với tài khoản này sẽ bị đăng xuất ngay lập tức.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pwdNew !== pwdConfirm) {
                toast({
                  title: "Lỗi",
                  description: "Mật khẩu mới và xác nhận không khớp",
                  variant: "destructive",
                });
                return;
              }
              changePasswordMutation.mutate({
                currentPassword: pwdCurrent,
                newPassword: pwdNew,
              });
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="pwd-current">Mật khẩu hiện tại</Label>
              <PasswordInput
                id="pwd-current"
                value={pwdCurrent}
                onChange={(e) => setPwdCurrent(e.target.value)}
                required
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd-new">Mật khẩu mới</Label>
              <PasswordInput
                id="pwd-new"
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                required
                minLength={6}
                maxLength={64}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd-confirm">Xác nhận mật khẩu mới</Label>
              <PasswordInput
                id="pwd-confirm"
                value={pwdConfirm}
                onChange={(e) => setPwdConfirm(e.target.value)}
                required
                minLength={6}
                maxLength={64}
                data-testid="input-confirm-password"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwdOpen(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={
                  !pwdCurrent || pwdNew.length < 6 || changePasswordMutation.isPending
                }
                data-testid="button-save-password"
              >
                Đổi mật khẩu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
