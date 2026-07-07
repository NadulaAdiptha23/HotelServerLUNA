package com.codeWithProject.HotelServer.services.auth;

import com.codeWithProject.HotelServer.dto.SignupRequest;
import com.codeWithProject.HotelServer.dto.UserDto;
import com.codeWithProject.HotelServer.dto.UserUpdateRequest;
import com.codeWithProject.HotelServer.entity.User;
import com.codeWithProject.HotelServer.enums.UserRole;
import com.codeWithProject.HotelServer.repository.UserRepository;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityExistsException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void initializeUsers() {
        repairUserRoleSchema();
        repairUserRoles();
        createAnAdminAccount();
    }

    private void repairUserRoleSchema() {
        jdbcTemplate.execute("""
                ALTER TABLE `user`
                MODIFY COLUMN `user_role` ENUM('ADMIN','CUSTOMER') NULL
                """);
    }

    private void repairUserRoles() {
        int normalizedCustomers = userRepository.normalizeCustomerRoles();
        int normalizedAdmin = userRepository.normalizeAdminRole();

        if (normalizedCustomers > 0 || normalizedAdmin > 0) {
            System.out.println("Repaired user roles");
        }
    }

    private void createAnAdminAccount() {
        Optional<User> adminAccount = userRepository.findFirstByEmail("admin@test.com");

        if (adminAccount.isEmpty()) {

            User user = new User();
            user.setEmail("admin@test.com");
            user.setName("Admin");
            user.setUserRole(UserRole.ADMIN);
            user.setPassword(passwordEncoder.encode("admin"));

            userRepository.save(user);

            System.out.println("Admin account created successfully");

        } else {
            System.out.println("Admin account already exists");
        }
    }

    public UserDto createUser(SignupRequest signupRequest){

        if(userRepository.findFirstByEmail(signupRequest.getEmail()).isPresent()){
            throw new EntityExistsException("User Already Present With email " + signupRequest.getEmail());
        }

        User user = new User();
        user.setEmail(signupRequest.getEmail());
        user.setName(signupRequest.getName());
        user.setUserRole(UserRole.CUSTOMER);
        user.setPassword(passwordEncoder.encode(signupRequest.getPassword()));

        User createdUser = userRepository.save(user);

        return createdUser.getUserDto();
    }

    @Override
    public List<UserDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(User::getUserDto)
                .toList();
    }

    @Override
    public UserDto getUserById(Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return user.getUserDto();
    }

    @Override
    public UserDto updateUser(Long id, UserUpdateRequest userUpdateRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String email = userUpdateRequest.getEmail();
        if (email != null && !email.isBlank() && !email.equalsIgnoreCase(user.getEmail())) {
            Optional<User> existingUser = userRepository.findFirstByEmail(email);
            if (existingUser.isPresent() && !existingUser.get().getId().equals(id)) {
                throw new EntityExistsException("User Already Present With email " + email);
            }
            user.setEmail(email);
        }

        if (userUpdateRequest.getName() != null && !userUpdateRequest.getName().isBlank()) {
            user.setName(userUpdateRequest.getName());
        }

        if (userUpdateRequest.getPassword() != null && !userUpdateRequest.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(userUpdateRequest.getPassword()));
        }

        if (userUpdateRequest.getUserRole() != null) {
            user.setUserRole(userUpdateRequest.getUserRole());
        }

        return userRepository.save(user).getUserDto();
    }

    @Override
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found");
        }

        userRepository.deleteById(id);
    }
}
