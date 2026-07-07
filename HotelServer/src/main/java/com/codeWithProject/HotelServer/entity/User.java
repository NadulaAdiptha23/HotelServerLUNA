package com.codeWithProject.HotelServer.entity;

import com.codeWithProject.HotelServer.dto.UserDto;
import com.codeWithProject.HotelServer.enums.UserRole;
import jakarta.persistence.*;
import lombok.Data;
import lombok.Setter;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Data
@Setter
@Entity
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String email;
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role")
    private UserRole userRole;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(getResolvedUserRole().name()));
    }

    @Override
    public @Nullable String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
    
    public UserDto getUserDto() {
        UserDto dto = new UserDto();
        dto.setId(id);
        dto.setName(name);
        dto.setEmail(email);
        dto.setUserRole(getResolvedUserRole());

        return dto;
    }

    public UserRole getResolvedUserRole() {
        return userRole != null ? userRole : UserRole.CUSTOMER;
    }

    @PrePersist
    @PreUpdate
    public void ensureUserRole() {
        if (userRole == null) {
            userRole = UserRole.CUSTOMER;
        }
    }


    public void setUserRole(UserRole userRole) {

        this.userRole = userRole;
    }
}
